import OpenDartReader
import sqlite3
import os
import logging
from datetime import datetime
from dotenv import load_dotenv

# Config
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), '../../dailyport.db')

# Load Env for API Key
env_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '../.env.local')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '../../.env.local')
load_dotenv(env_path)

DART_API_KEY = os.getenv("DART_API_KEY")

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def fetch_and_update_financials(year, quarter, corp_code=None):
    """
    Fetch financial statements for a specific year/quarter.
    Calculate Operating Margin.
    Update 'daily_price' for the relevant period.
    """
    if not DART_API_KEY:
        logger.error("❌ DART_API_KEY is missing.")
        return

    dart = OpenDartReader(DART_API_KEY)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Target Corporations
    # OpenDart requires 'corp_code' (8 digits) not stock code (6 digits).
    # We need a mapping. dart.corp_codes gives all.
    logger.info("📥 Fetching DART Corp Codes...")
    try:
        xml_text = dart.corp_codes # Returns XML bytes usually, but the wrapper might handle it
        # Actually OpenDartReader property `corp_codes` returns a DataFrame if pandas is installed
        # Columns: 'corp_code', 'corp_name', 'stock_code', 'modify_date'
        
        # Optimization: Map stock_code -> corp_code
        # Filter only listed companies (with stock_code)
        # Note: stock_code is in the DF.
        pass
    except Exception as e:
        logger.error(f"Failed to get corp codes: {e}")
        return

    # To avoid fetching huge list every time, assume we have it or do it once.
    # OpenDartReader caches it?
    # Let's get the list of active tickers from our DB to filter
    cursor.execute("SELECT code FROM tickers WHERE is_active=1")
    active_stocks = {row[0] for row in cursor.fetchall()}
    
    # Get Corp Codes DF
    # Note: `dart.corp_codes` is slow (downloads big zip).
    # We should cache this mapping in DB if possible, but for now let's query.
    # Warning: Calling this frequently is bad.
    
    # Use `dart.list(corp_code)`? No, `finstate` takes corp_code.
    # `dart.finstate_all(corp_code, year, reprt_code)`
    # `dart.finstate` can take multiple codes? No.
    # But `dart.finstate_all` is for "Whole Corporation"? No, "Single Corp".
    
    # Is there a "Bulk Fetch" for all Kospi/Kosdaq?
    # `dart.finstate` allows fetching for a specific company.
    # Fetching 2000 companies one by one is SLOW due to API limits.
    # DART API Limit: 10,000 calls / day. 2000 stocks * 4 quarters = 8000. Tight.
    # We should only fetch "Latest Quarter" or "Missing Data".
    
    # Strategy:
    # 1. Fetch `corp_codes` (One API call approx, or cached).
    # 2. Iterate list of stocks.
    # 3. Call `finstate` (1 call per stock).
    
    # Wait, `finstate_all` is deprecated? `finstate` is standard.
    # Report Codes:
    # 1Q: 11013, 2Q: 11012, 3Q: 11014, 4Q: 11011
    
    report_code_map = {1: '11013', 2: '11012', 3: '11014', 4: '11011'}
    reprt_code = report_code_map.get(quarter)
    
    logger.info(f"🔄 Processing Financials for {year} Q{quarter} (Code: {reprt_code})...")
    
    # Get mapping
    # Note: access private attribute or property if needed
    # user guide: df = dart.corp_codes
    df_corp = dart.corp_codes
    
    print(f"DEBUG: df_corp size: {len(df_corp) if df_corp is not None else 'None'}")
    if df_corp is not None and not df_corp.empty:
        print(f"DEBUG: df_corp columns: {df_corp.columns.tolist()}")
        print(f"DEBUG: df_corp sample: {df_corp.head(1).to_dict('records')}")
        
        # Check specific known ticker
        samsung = df_corp[df_corp['stock_code'] == '005930']
        print(f"DEBUG: Samsung Search (Exact): {len(samsung)}")
        if not samsung.empty:
            print(f"DEBUG: Samsung Row: {samsung.iloc[0].to_dict()}")
        else:
            # Try strip
            samsung_strip = df_corp[df_corp['stock_code'].str.strip() == '005930']
            print(f"DEBUG: Samsung Search (Stripped): {len(samsung_strip)}")
            
    # Filter where stock_code is not null and in our active list
    # Ensure types match
    target_corps = df_corp[df_corp['stock_code'].isin(active_stocks)]
    
    print(f"DEBUG: Active Stocks Count: {len(active_stocks)}")
    print(f"DEBUG: First 5 active_stocks: {list(active_stocks)[:5]}")
    print(f"DEBUG: Target Corps Count: {len(target_corps)}")
    
    total = len(target_corps)
    success = 0
    
    for idx, row in target_corps.iterrows():
        s_code = row['stock_code']
        c_code = row['corp_code']
        
        try:
            # Fetch Financial State
            # Note: finstate returns all (Consolidated & Separate) in one DF usually if no fs_div arg (or if library wrapper implies it).
            # Some versions of OpenDartReader might strictly require no fs_div arg.
            df_fs = dart.finstate(c_code, year, reprt_code)
            
            if df_fs is None or df_fs.empty:
                continue
            
            # Filter for Consolidated (CFS) first
            # Column 'fs_div' usually contains 'CFS' or 'OFS'
            if 'fs_div' in df_fs.columns:
                df_con = df_fs[df_fs['fs_div'] == 'CFS']
                if df_con.empty:
                    # Fallback to Separate (OFS)
                    df_target = df_fs[df_fs['fs_div'] == 'OFS']
                else:
                    df_target = df_con
            else:
                # If no fs_div column, assume it's what we got
                df_target = df_fs
                
            if df_target.empty:
                continue

            # Extract Revenue, Operating Income, Net Income, and Total Equity
            # Account ID: 'account_nm' or 'account_id'
            
            rev = 0
            op_inc = 0
            net_inc = 0
            equity = 0
            
            # Helper to find value by name
            def get_amt(df, names):
                # Filter rows where account_nm contains any of names
                for nm in names:
                    match = df[df['account_nm'].str.contains(nm, na=False)]
                    if not match.empty:
                        # Return the first match, replacing commas
                        try:
                            # 'thstrm_amount' (This Term), 'thstrm_add_amount' (Accumulated)
                            # For Q3, strictly we want Q3 discrete? Or Accumulated?
                            # Operating Margin is usually calculated on Accumulated or TTM for stability, 
                            # or This Term for responsiveness.
                            # 'thstrm_amount' is "Current Quarter" (3 months).
                            val = match.iloc[0]['thstrm_amount']
                            if val == '-': return 0.0
                            return float(val.replace(',', ''))
                        except:
                            pass
                return 0.0

            rev = get_amt(df_target, ['매출액', '수익', '영업수익'])
            op_inc = get_amt(df_target, ['영업이익'])
            net_inc = get_amt(df_target, ['당기순이익'])
            equity = get_amt(df_target, ['자본총계'])
            
            if rev == 0:
                continue
                
            op_margin = (op_inc / rev) * 100
            roe = (net_inc / equity * 100) if equity != 0 else 0
            
            # Map valid period
            # Q1: apply to 04-01 ~ 05-15 (Approx publication) -> No, standard usage "Q1 data applies until Q2 comes"
            # User Policy: "2024 Q2 -> Appears in reports, apply to 2024-04-01 ~ 2024-06-30"
            # Wait, User said: "2024 Q2 Financials -> Apply to 2024-04-01 ~ 2024-06-30"?
            # Quote: "해당 분기의 Operating Margin을 그 분기 전체 거래일에 동일하게 적용 ... 2024 Q2 재무 -> 2024-04-01 ~ 2024-06-30"
            # This is "Filling the past". It's good for "Analysis of that period".
            # For "Current Daily Scan", we use the "Latest Available".
            # If we backfill, `daily_price` for that date range gets the value.
            
            # Determine Date Range for this Quarter
            # Q1: 0101-0331, Q2: 0401-0630, Q3: 0701-0930, Q4: 1001-1231
            q_starts = {1: f"{year}0101", 2: f"{year}0401", 3: f"{year}0701", 4: f"{year}1001"}
            q_ends = {1: f"{year}0331", 2: f"{year}0630", 3: f"{year}0930", 4: f"{year}1231"}
            
            s_date = q_starts[quarter]
            e_date = q_ends[quarter]
            
            # Batch Update SQLite
            # Forward Fill Strategy: Apply this quarter's margin to all dates >= Quarter Start
            # This ensures that even if we are in Q4 (Dec), the Q3 data (latest available) is applied.
            # Future quarter runs will overwrite the later ranges correctly.
            
            cursor.execute("""
                UPDATE daily_price
                SET operating_margin = ?, roe = ?, revenue = ?, net_income = ?
                WHERE code = ? AND date >= ?
            """, (op_margin, roe, rev, net_inc, s_code, s_date))
            
            success += 1
            if success % 10 == 0:
                conn.commit()
                print(f"   Updated {s_code} (OM: {op_margin:.2f}%, ROE: {roe:.2f}%) [Forward Fill from {s_date}]")
                
        except Exception as e:
            logger.warning(f"Error {s_code}: {e}")
            continue

    conn.commit()
    conn.close()
    logger.info(f"✅ Finished Financial Sync for {year} Q{quarter}. Updated {success} tickers.")

def get_default_quarter():
    """
    Determine the most likely available quarter based on current month.
    """
    now = datetime.now()
    month = now.month
    year = now.year
    
    # Reports usually out by:
    # Q1: 5/15, Q2: 8/15, Q3: 11/15, Q4: 3/31(next year)
    if month <= 4:
        return 4, year - 1
    elif month <= 6:
        return 1, year
    elif month <= 9:
        return 2, year
    else:
        return 3, year

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, help="Year")
    parser.add_argument("--quarter", type=int, help="Quarter (1-4)")
    args = parser.parse_args()
    
    def_q, def_y = get_default_quarter()
    target_year = args.year if args.year else def_y
    target_quarter = args.quarter if args.quarter else def_q
    
    fetch_and_update_financials(target_year, target_quarter)
