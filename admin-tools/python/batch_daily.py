
import sqlite3
import os
import sys
import time
from datetime import datetime, timedelta
import logging
from pykrx import stock
try:
    import FinanceDataReader as fdr
    FDR_AVAILABLE = True
except ImportError:
    FDR_AVAILABLE = False

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    print("Error: pandas is required but not available. Please install pandas.")
    sys.exit(1)

# Logging Setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
# Suppress pykrx internal logging clutter
logging.getLogger("pykrx").setLevel(logging.ERROR)

# Fix pykrx logging issue
logging.getLogger("pykrx.website.comm.util").setLevel(logging.WARNING)



# Configuration
DB_PATH = os.path.join(os.path.dirname(__file__), '../../dailyport.db')
START_DATE_LIMIT = "20230101"
now = datetime.now()

# Determine target date based on market hours
# KOSPI market hours: 09:00-15:30 KST
market_open = now.replace(hour=9, minute=0, second=0, microsecond=0)
market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)

if now.weekday() >= 5:  # Weekend
    # Adjust to recent Friday
    days_to_friday = (now.weekday() - 4) % 7
    if days_to_friday == 0:
        days_to_friday = 7
    today_dt = now - timedelta(days=days_to_friday)
else:
    today_dt = now

# If before market open or weekend, use previous trading day
if now < market_open or now.weekday() >= 5:
    today_dt -= timedelta(days=1)
    # Skip weekends if landed on weekend
    while today_dt.weekday() >= 5:
        today_dt -= timedelta(days=1)

TODAY = today_dt.strftime("%Y%m%d")
print(f"Target date for data sync: {TODAY} (Current time: {now.strftime('%Y-%m-%d %H:%M:%S')})")

def is_market_open(date_str):
    """Checks if the market was open on a specific date using a proxy ticker."""
    try:
        # Using KODEX Leveraged (122630) as a proxy for KOSPI market activity
        df = stock.get_market_ohlcv_by_date(date_str, date_str, "122630")
        return not df.empty
    except Exception as e:
        logger.warning(f"Market open check failed (PyKRX blocked?): {e}")
        # If we can't check, assume it might be open if it's a weekday, 
        # but safely return False or True based on a simpler heuristic?
        # For now, return True to allow FDR to try anyway if it's not a weekend.
        from datetime import datetime
        dt = datetime.strptime(date_str, "%Y%m%d")
        return dt.weekday() < 5 

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def update_tickers(conn):
    print("Updating Ticker Master...")
    cursor = conn.cursor()

    count = 0
    consecutive_failures = 0

    # Try FinanceDataReader first (more reliable)
    if FDR_AVAILABLE:
        try:
            # FDR provides KRX stock list
            df_krx = fdr.StockListing('KRX')
            if not df_krx.empty:
                for _, row in df_krx.iterrows():
                    try:
                        code = str(row['Code']).zfill(6)  # Ensure 6-digit code
                        name = str(row['Name'])
                        market = str(row['Market'])
                        cursor.execute("""
                            INSERT INTO tickers (code, name, market, last_updated)
                            VALUES (?, ?, ?, ?)
                            ON CONFLICT(code) DO UPDATE SET
                                last_updated=excluded.last_updated,
                                is_active=1
                        """, (code, name, market, datetime.now().isoformat()))
                        count += 1
                    except Exception as e:
                        logger.debug(f"Failed to update ticker {row.get('Code')}: {e}")
                        continue
                print(f"   found {len(df_krx)} tickers via FDR")
            else:
                consecutive_failures += 1
        except Exception as e:
            logger.warning(f"FDR ticker fetch failed: {e}")
            consecutive_failures += 1

    # Fallback to pykrx if FDR failed or not available
    if not FDR_AVAILABLE or consecutive_failures > 0:
        markets = ["KOSPI", "KOSDAQ", "KONEX"]
        for market in markets:
            try:
                # Pass TODAY explicitly to avoid pykrx internal "latest date" fetch bug (IndexError)
                try:
                    tickers = stock.get_market_ticker_list(date=TODAY, market=market)
                except TypeError:
                    # If older pykrx doesn't support date arg (though it should), try without
                    tickers = stock.get_market_ticker_list(market=market)
                except IndexError:
                     # If TODAY fails (maybe holiday?), try yesterday
                    yesterday = (datetime.strptime(TODAY, "%Y%m%d") - timedelta(days=1)).strftime("%Y%m%d")
                    tickers = stock.get_market_ticker_list(date=yesterday, market=market)
                print(f"   found {len(tickers)} in {market} (pykrx fallback)")

                if not tickers:
                    consecutive_failures += 1
                    if consecutive_failures >= 3:
                        logger.warning("No tickers found in any market. Likely a holiday or server issue. Skipping ticker update.")
                        break
                    continue

                consecutive_failures = 0
                for code in tickers:
                    try:
                        name = stock.get_market_ticker_name(code)
                        cursor.execute("""
                            INSERT INTO tickers (code, name, market, last_updated)
                            VALUES (?, ?, ?, ?)
                            ON CONFLICT(code) DO UPDATE SET
                                last_updated=excluded.last_updated,
                                is_active=1
                        """, (code, name, market, datetime.now().isoformat()))
                        count += 1
                    except Exception as e:
                        logger.debug(f"Failed to update ticker {code}: {e}")
                        continue
            except Exception as e:
                logger.error(f"Error fetching {market} tickers: {e}")
                consecutive_failures += 1
                if consecutive_failures >= 3:
                    break

    conn.commit()
    if count == 0:
        print("Warning: No tickers updated. Using existing ticker data.")
    else:
        print(f"Master Updated: {count} tickers processed.")

def get_last_sync_date(conn):
    """Returns the last date that has both price AND supply data."""
    cursor = conn.cursor()
    # Check for the latest date where both have at least some data
    cursor.execute("""
        SELECT MIN(price_max, supply_max) FROM (
            SELECT MAX(date) as price_max FROM daily_price
        ) JOIN (
            SELECT MAX(date) as supply_max FROM daily_supply
        )
    """)
    res = cursor.fetchone()[0]
    return res.replace('-', '') if res else None

def repair_supply_bulk(conn, start_date, end_date=None):
    if not end_date:
        end_date = TODAY
    print(f"Starting Fast Supply Repair ({start_date} to {end_date})...")
    cursor = conn.cursor()
    
    # Get all active tickers
    cursor.execute("SELECT code, name FROM tickers WHERE is_active = 1")
    tickers = cursor.fetchall()
    total = len(tickers)
    
    print(f"Processing {total} tickers individually...")
    
    consecutive_failures = 0
    success_count = 0
    
    for i, (code, name) in enumerate(tickers):
        try:
            # Fetch for the entire range for THIS ticker
            try:
                df = stock.get_market_trading_value_by_date(start_date, end_date, code)
            except ValueError as ve:
                # pykrx sometimes raises ValueError: Length mismatch: Expected axis has 0 elements, new values have 6 elements
                # This happens on holidays or when KRX returns unconventional empty results.
                if "Length mismatch" in str(ve):
                    # If this happens, it's very likely a holiday or no data at all for this range.
                    # We skip the ticker.
                    consecutive_failures += 1
                    continue
                raise ve
            except Exception as fetch_err:
                # KRX sometimes returns malformed data on holidays causing pykrx to crash on column assignment
                # Warning is enough, don't crash the script
                # logger.warning(f"Fetch failed for {code}: {fetch_err}")
                consecutive_failures += 1
                if consecutive_failures > 50:
                     logger.warning(f"Too many consecutive fetch failures. Aborting.")
                     break
                continue
            
            # Check if dataframe is truly valid and has data
            if df is None or df.empty:
                consecutive_failures += 1
                if consecutive_failures > 50:
                    logger.warning(f"Too many empty results. Probably a holiday or no data for {start_date} to {end_date}. Stopping.")
                    break
                continue

            # Pandas sometimes returns a DF with index but no columns if data is missing for specific fields
            if len(df.columns) == 0:
                 continue

            consecutive_failures = 0 # Reset on success or at least non-error
            
            supply_data = []
            for date_val, row in df.iterrows():
                try:
                    date_str = date_val.strftime("%Y%m%d")
                    supply_data.append((
                        code, date_str,
                        int(row.get('개인', 0)),
                        int(row.get('외국인합계', 0)),
                        int(row.get('기관합계', 0)),
                        int(row.get('연기금', 0)) # Ensure we grab pension too
                    ))
                except Exception as row_e:
                    logger.debug(f"Row error for {code} on {date_val}: {row_e}")
                    continue
            
            if supply_data:
                cursor.executemany("""
                    INSERT OR REPLACE INTO daily_supply (code, date, individual, foreigner, institution, pension)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, supply_data)
                conn.commit()
                success_count += 1
            
            if (i+1) % 50 == 0:
                print(f"   [{i+1}/{total}] {code} ({name}) synced.")
            
            # Subtle delay to respect KRX
            time.sleep(0.05)
            
        except Exception as e:
            consecutive_failures += 1
            # logger.warning(f"Error {code}: {e}")
            
            if consecutive_failures > 10:
                logger.error(f"Consecutive failures ({consecutive_failures}) detected at {code}. "
                             f"This usually means the KRX server is down or it's a holiday ({start_date}). "
                             "Check your internet or the date. Stopping Supply Sync.")
                break
            continue

    print(f"Fast Supply Repair Finished. (Synced {success_count} tickers)")

def sync_market_data_bulk(conn, start_date=None, end_date=None, test_mode=False, force_supply=False):
    print(f"Starting Bulk Market Sync ({start_date} to {end_date})...")
    cursor = conn.cursor()
    
    # 1. Determine Date Range
    if not start_date:
        last_date = get_last_sync_date(conn)
        if last_date:
            last_dt = datetime.strptime(last_date, "%Y%m%d")
            start_date = (last_dt + timedelta(days=1)).strftime("%Y%m%d")
        else:
            start_date = START_DATE_LIMIT
            
    if not end_date:
        end_date = TODAY

    # Get business days in range
    # PyKRX doesn't have a direct "business days" list, but we can get it from OHLCV of a major index
    # or just try every day. Trying every day is safer but slightly slower.
    # Let's get the list of trading days from KOSPI index.
    try:
        trading_days = stock.get_market_ohlcv_by_date(start_date, end_date, "122630") # KODEX Leveraged as proxy for KOSPI days
        if trading_days.empty:
            raise ValueError("Empty response from PyKRX")
        valid_dates = trading_days.index.strftime("%Y%m%d").tolist()
    except Exception as e:
        logger.warning(f"Failed to get trading days via PyKRX: {e}. Falling back to calendar range.")
        # Fallback to manual date range if index fetch fails
        current_dt = datetime.strptime(start_date, "%Y%m%d")
        end_dt = datetime.strptime(end_date, "%Y%m%d")
        valid_dates = []
        while current_dt <= end_dt:
            # Simple weekday check as a rough proxy
            if current_dt.weekday() < 5:
                valid_dates.append(current_dt.strftime("%Y%m%d"))
            current_dt += timedelta(days=1)

    if test_mode:
        valid_dates = valid_dates[-3:] # Only last 3 days
        print(f"🧪 Test Mode: Syncing only {len(valid_dates)} dates: {valid_dates}")

    for date_str in valid_dates:
        # If not force_supply, we skip if data already exists in both
        if not force_supply:
            cursor.execute("SELECT count(*) FROM daily_supply WHERE date = ?", (date_str,))
            if cursor.fetchone()[0] > 100: # Assuming market-wide data has > 100 tickers
                print(f"📅 Skipping {date_str} (Supply data already exists)")
                continue

        print(f"📅 Processing {date_str}...")
        try:
            # 2. Bulk Fetch Data for each market
            all_data = []
            for market in ["KOSPI", "KOSDAQ"]:
                # OHLCV (Price, Volume, Trading Value)
                df_ohlcv = stock.get_market_ohlcv_by_ticker(date_str, market=market)
                if df_ohlcv.empty:
                    print(f"   ⚠️ No OHLCV data for {date_str} in {market}")
                    continue
                
                # Market Cap (Market Cap)
                df_cap = stock.get_market_cap_by_ticker(date_str, market=market)
                    
                # Fundamentals (PER, PBR, EPS, BPS, DIV)
                df_fund = stock.get_market_fundamental_by_ticker(date_str, market=market)
                
                # Investor Supply (Net Purchase)
                # We need net purchase for Individual, Foreigner, Institution
                df_ind = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, market, "개인")
                df_for = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, market, "외국인")
                df_ins = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, market, "기관합계")
                df_pen = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, market, "연기금")

                # Merge all on ticker code
                df_m = df_ohlcv.copy()
                
                # Helper for safe join to handle empty DFs or missing columns
                def safe_join(target, source, cols, rename_map=None):
                    if source is not None and not source.empty:
                        valid_cols = [c for c in cols if c in source.columns]
                        if valid_cols:
                            tmp = source[valid_cols].copy()
                            if rename_map:
                                actual_rename = {k: v for k, v in rename_map.items() if k in tmp.columns}
                                tmp = tmp.rename(columns=actual_rename)
                            
                            # Handing column overlap
                            overlap = [c for c in tmp.columns if c in target.columns]
                            if overlap:
                                target.update(tmp[overlap])
                                others = [c for c in tmp.columns if c not in target.columns]
                                if others:
                                    target = target.join(tmp[others], how='left')
                                return target
                            else:
                                return target.join(tmp, how='left')
                    return target

                # Add Market Cap
                df_m = safe_join(df_m, df_cap, ['시가총액'])
                    
                # Add Fundamentals
                fund_cols = ['BPS', 'PER', 'PBR', 'EPS', 'DIV']
                df_m = safe_join(df_m, df_fund, fund_cols, {c: f"{c}_fund" for c in fund_cols})
                
                # Add Supply (Investor Breakdown)
                df_m = safe_join(df_m, df_ind, ['순매수거래대금'], {'순매수거래대금': 'individual'})
                df_m = safe_join(df_m, df_for, ['순매수거래대금'], {'순매수거래대금': 'foreigner'})
                df_m = safe_join(df_m, df_ins, ['순매수거래대금'], {'순매수거래대금': 'institution'})
                df_m = safe_join(df_m, df_pen, ['순매수거래대금'], {'순매수거래대금': 'pension'})
                
                all_data.append(df_m)

            if not all_data:
                continue
                
            df = pd.concat(all_data)
            # print("DEBUG: DF Columns:", df.columns.tolist())

            # 3. Prepare for DB
            price_data = []
            supply_data = []
            
            # Helper to get the best column (original or with _fund suffix if original is from index)
            def get_col(row, base_name):
                # Fundamental columns often appear in OHLCV as empty/legacy if not careful
                # We want the ones from df_fund
                if f"{base_name}_fund" in row:
                    return row[f"{base_name}_fund"]
                return row.get(base_name, 0)

            for code, row in df.iterrows():
                # daily_price table
                price_data.append((
                    code, date_str,
                    float(row.get('시가', 0)), float(row.get('고가', 0)), 
                    float(row.get('저가', 0)), float(row.get('종가', 0)),
                    int(row.get('거래량', 0)), float(row.get('거래대금', 0)), float(row.get('시가총액', 0)),
                    float(get_col(row, 'PER')), float(get_col(row, 'PBR')),
                    float(get_col(row, 'EPS')), float(get_col(row, 'BPS')),
                    float(get_col(row, 'DIV'))
                ))
                
                # daily_supply table
                supply_data.append((
                    code, date_str,
                    int(row.get('individual', 0)) if pd.notnull(row.get('individual')) else 0, 
                    int(row.get('foreigner', 0)) if pd.notnull(row.get('foreigner')) else 0, 
                    int(row.get('institution', 0)) if pd.notnull(row.get('institution')) else 0,
                    int(row.get('pension', 0)) if pd.notnull(row.get('pension')) else 0
                ))

            # 5. Bulk Insert
            cursor.executemany("""
                INSERT OR REPLACE INTO daily_price 
                (code, date, open, high, low, close, volume, trading_value, market_cap, per, pbr, eps, bps, div_yield)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, price_data)
            
            cursor.executemany("""
                INSERT OR REPLACE INTO daily_supply (code, date, individual, foreigner, institution, pension)
                VALUES (?, ?, ?, ?, ?, ?)
            """, supply_data)
            
            conn.commit()
            print(f"   ✅ {len(price_data)} records synced.")
            
            # Rate limit protection (optional for date-based, but safe)
            time.sleep(1)

        except Exception as e:
            print(f"❌ Error processing date {date_str}: {e}")
            import traceback
            traceback.print_exc()

    print("✨ Bulk Sync Completed.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true", help="Sync last 3 days only")
    parser.add_argument("--start", type=str, help="Start date (YYYYMMDD)")
    parser.add_argument("--end", type=str, help="End date (YYYYMMDD)")
    parser.add_argument("--force-supply", action="store_true", help="Sync supply data even if price exists")
    parser.add_argument("--repair-supply", action="store_true", help="Efficiently repair supply data per ticker")
    args = parser.parse_args()

    conn = get_db_connection()
    
    # 1. Update Master
    update_tickers(conn)
    
    # 2. Choice of Sync Mode
    if args.repair_supply:
        start_date = args.start if args.start else START_DATE_LIMIT
        end_date = args.end if args.end else TODAY
        
        # Holiday Check for repair
        if start_date == end_date:
            if not is_market_open(start_date):
                print(f"📅 Skipping Supply Repair: Market is closed on {start_date}")
                conn.close()
                sys.exit(0)

        repair_supply_bulk(conn, start_date, end_date)
    else:
        # NEW V2 Pipeline
        print("Running V2 Data Pipeline...")
        
        # Holiday Check for today
        if not args.start and not is_market_open(TODAY):
             print(f"📅 Skipping Daily Pipeline: Market is closed today ({TODAY})")
             conn.close()
             sys.exit(0)
        
        # 1. Price Sync (FDR)
        try:
            from batch_price_daily import sync_daily_price
            sync_daily_price(args.start, args.end)
        except ImportError:
            print("❌ batch_price_daily module not found.")
        except Exception as e:
            print(f"❌ Price Sync Failed: {e}")
            
        # 2. Financial Sync (OpenDart) - Optional/On-Demand
        # Usually run manually or once per quarter.
        # But we can check if explicit flag is passed?
        # For now, let's leave it as a separate manual step unless args say so.
        # Or blindly try to run for current quarter?
        # Let's keep it manual for now to avoid consuming API limits on every daily run.
        
        # 3. Supply Repair (Legacy/PyKRX for supply?)
        # Wait, FDR doesn't give Supply (Foreigner/Institution) history easily.
        # The User Plan says: "(3) batch_merge_daily.py ... daily_price <- quarterly"
        # AND "Strategy 2: Twin Engines" NEEDS Supply Data.
        # FDR 'KRX' listing doesn't give supply history.
        # We STILL need pykrx for `daily_supply` table!
        
        # So we must KEEP the Supply Sync logic (which uses pykrx) but use FDR for Price.
        # `repair_supply_bulk` function in THIS file does exactly that.
        # We should run it for the dates.
        
        if not args.test:
             _start = args.start if args.start else TODAY
             # repair_supply_bulk(conn, _start, args.end)
             print("⚠️ SKIPPING Supply Sync: PyKRX library is blocked by KRX service changes (2025/12).")
             print("   Only Price data (FDR) will be updated.")
             
    conn.close()
