
import sqlite3
import os
import sys
import time
import pandas as pd
from datetime import datetime, timedelta
from pykrx import stock

# Configuration
DB_PATH = os.path.join(os.path.dirname(__file__), '../../dailyport.db')
START_DATE_LIMIT = "20230101"
TODAY = datetime.now().strftime("%Y%m%d")

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def update_tickers(conn):
    print("📋 Updating Ticker Master...")
    cursor = conn.cursor()
    
    # Get all tickers for the major markets
    markets = ["KOSPI", "KOSDAQ", "KONEX"]
    count = 0
    
    for market in markets:
        try:
            tickers = stock.get_market_ticker_list(market=market)
            print(f"   found {len(tickers)} in {market}")
            
            for code in tickers:
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
            print(f"❌ Error fetching {market} tickers: {e}")

    conn.commit()
    print(f"✅ Master Updated: {count} tickers processed.")

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
    print(f"🛠 Starting Fast Supply Repair ({start_date} to {end_date})...")
    cursor = conn.cursor()
    
    # Get all active tickers
    cursor.execute("SELECT code, name FROM tickers WHERE is_active = 1")
    tickers = cursor.fetchall()
    total = len(tickers)
    
    print(f"📊 Processing {total} tickers individually...")
    
    for i, (code, name) in enumerate(tickers):
        try:
            # Fetch for the entire range for THIS ticker
            # PyKRX returns a DF indexed by Date with columns: [기관합계, 기타법인, 개인, 외국인합계, 전체]
            df = stock.get_market_trading_value_by_date(start_date, end_date, code)
            
            if df.empty:
                continue
                
            supply_data = []
            for date_val, row in df.iterrows():
                # date_val is a Timestamp
                date_str = date_val.strftime("%Y%m%d")
                supply_data.append((
                    code, date_str,
                    int(row.get('개인', 0)),
                    int(row.get('외국인합계', 0)),
                    int(row.get('기관합계', 0))
                ))
            
            if supply_data:
                cursor.executemany("""
                    INSERT OR REPLACE INTO daily_supply (code, date, individual, foreigner, institution)
                    VALUES (?, ?, ?, ?, ?)
                """, supply_data)
                conn.commit()
            
            if (i + 1) % 50 == 0 or (i + 1) == total:
                print(f"   [{i+1}/{total}] {code} {name} synced ({len(supply_data)} days).")
            
            # Subtle delay to respect KRX
            time.sleep(0.05)
            
        except Exception as e:
            print(f"\n❌ Error processing {code}: {e}")
            time.sleep(2) # Wait longer on error

    print("\n✨ Supply Repair Task Completed.")

def sync_market_data_bulk(conn, start_date=None, end_date=None, test_mode=False, force_supply=False):
    print(f"🚀 Starting Bulk Market Sync ({start_date} to {end_date})...")
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
    trading_days = stock.get_market_ohlcv_by_date(start_date, end_date, "122630") # KODEX Leveraged as proxy for KOSPI days
    if trading_days.empty:
        # Fallback to manual date range if index fetch fails
        current_dt = datetime.strptime(start_date, "%Y%m%d")
        end_dt = datetime.strptime(end_date, "%Y%m%d")
        valid_dates = []
        while current_dt <= end_dt:
            valid_dates.append(current_dt.strftime("%Y%m%d"))
            current_dt += timedelta(days=1)
    else:
        valid_dates = trading_days.index.strftime("%Y%m%d").tolist()

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
                    int(row.get('institution', 0)) if pd.notnull(row.get('institution')) else 0
                ))

            # 5. Bulk Insert
            cursor.executemany("""
                INSERT OR REPLACE INTO daily_price 
                (code, date, open, high, low, close, volume, trading_value, market_cap, per, pbr, eps, bps, div_yield)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, price_data)
            
            cursor.executemany("""
                INSERT OR REPLACE INTO daily_supply (code, date, individual, foreigner, institution)
                VALUES (?, ?, ?, ?, ?)
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
        repair_supply_bulk(conn, start_date, args.end)
    else:
        # NEW V2 Pipeline
        print("🚀 Running V2 Data Pipeline...")
        
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
             _start = args.start if args.start else datetime.now().strftime("%Y%m%d")
             repair_supply_bulk(conn, _start, args.end)
             
    conn.close()

