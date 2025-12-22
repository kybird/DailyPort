
import os
import sys
import json
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client
from pykrx import stock
import pandas as pd

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
# Try to load from local .env, then parent .env.local
env_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '../.env.local')

load_dotenv(env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

logger.info(f"Loading env from: {env_path}")
logger.info(f"SUPABASE_URL present: {bool(SUPABASE_URL)}")
logger.info(f"SUPABASE_KEY present: {bool(SUPABASE_KEY)}")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials.")
    # Debug what keys ARE available
    # logger.info(f"Available keys: {list(os.environ.keys())}") 
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_stock_data(ticker):
    """
    Fetch price and investor data for a single ticker via PyKRX
    """
    code = ticker.replace('.KS', '').replace('.KQ', '')
    
    # Get today's date
    today = datetime.now().strftime("%Y%m%d")
    start_date = (datetime.now() - timedelta(days=5)).strftime("%Y%m%d") # Look back a few days for safety

    try:
        # 1. Get OHLCV (Price) - Most recent record
        # get_market_ohlcv returns a DataFrame
        df_ohlcv = stock.get_market_ohlcv(start_date, today, code)
        
        if df_ohlcv.empty:
            logger.warning(f"No OHLCV data for {ticker}")
            return None
        
        # Get the last row (most recent)
        latest_ohlcv = df_ohlcv.iloc[-1]
        last_date = df_ohlcv.index[-1].strftime("%Y-%m-%d")

        # 2. Get Investor Trading Value (Individual, Foreigner, Institution)
        # get_market_trading_value_by_date returns DataFrame
        # columns: ['기관합계', '기타법인', '개인', '외국인합계', '전체']
        df_investor = stock.get_market_trading_value_by_date(start_date, today, code)
        
        investor_data = {}
        if not df_investor.empty:
            latest_investor = df_investor.iloc[-1]
            investor_data = {
                'investor_individual': int(latest_investor['개인']),
                'investor_foreign': int(latest_investor['외국인합계']),
                'investor_institution': int(latest_investor['기관합계'])
            }

        # Construct payload
        market_data = {
            "ticker": ticker,
            "currentPrice": float(latest_ohlcv['종가']),
            "changePercent": float(latest_ohlcv['등락률']),
            "open": float(latest_ohlcv['시가']),
            "high": float(latest_ohlcv['고가']),
            "low": float(latest_ohlcv['저가']),
            "volume": int(latest_ohlcv['거래량']),
            "date": last_date,
            "currency": "KRW",
            # Add investor data
            **investor_data
        }
        
        # Historical data (last 5 days only for this payload? 
        # Or should we fetching full history? 
        # market-data.ts interface expects `historical` array. 
        # Let's provide a small slice of history if needed, or rely on client to keep history.
        # For now, let's keep it simple and just return the latest snapshot.
        # But wait, market-data.ts `MarketData` has `historical` array. 
        # Let's populate it with the fetched range (5 days).
        
        historical_list = []
        for date_idx, row in df_ohlcv.iterrows():
            historical_list.append({
                "date": date_idx.strftime("%Y-%m-%d"),
                "open": float(row['시가']),
                "high": float(row['고가']),
                "low": float(row['저가']),
                "close": float(row['종가']),
                "volume": int(row['거래량'])
            })
            
        market_data['historical'] = historical_list

        return market_data

    except Exception as e:
        logger.error(f"Error fetching {ticker}: {e}")
        return None

def sync_ticker(ticker):
    logger.info(f"Syncing {ticker}...")
    data = fetch_stock_data(ticker)
    if data:
        # Upsert to Supabase
        try:
            # We need to wrap 'data' inside the JSON column 'data'
            # Table schema: ticker (text, PK), data (jsonb), generated_at (timestamptz), source (text)
            
            payload = {
                "ticker": ticker,
                "data": data,
                "generated_at": datetime.now().isoformat(),
                "source": "PYKRX_SERVICE"
            }
            
            supabase.from_("analysis_cache").upsert(payload).execute()
            logger.info(f"Successfully synced {ticker}")
            print(json.dumps(data, indent=2)) # Print to stdout for debugging/bridge
        except Exception as e:
            logger.error(f"Supabase upsert error: {e}")
    else:
        logger.warning(f"Failed to get data for {ticker}")

# Vercel Serverless Function Handler
def handler(request):
    """
    Entry point for Vercel Serverless Function.
    Expecting query params: ?ticker=005930.KS or ?mode=sync-all (beware timeouts)
    """
    from urllib.parse import urlparse, parse_qs
    import json

    # Very basic parsing for Vercel python runtime (which passes a Flask-like Request object usually, 
    # but the raw signature can vary based on framework. 
    # Standard Vercel Python runtime: def handler(request): return Response(...)
    # For simplicity in this demo, we assume we just run a quick sync of a target.
    
    # NOTE: In a real Vercel environment, 'request' is a serverless Request object.
    # We will try to parse query parameters.
    
    try:
        # If request has .args or .query_params (Flask/Starlette)
        if hasattr(request, 'args'):
            params = request.args
        elif hasattr(request, 'query_params'):
            params = request.query_params
        else:
             # Fallback/Mock
            params = {}
            
        ticker = params.get('ticker')
        
        if ticker:
            logger.info(f"Vercel Handler: Syncing {ticker}")
            data = fetch_stock_data(ticker)
            if data:
                # Upsert logic is inside sync_ticker, but we called fetch_stock_data to just get return val?
                # sync_ticker does the upsert.
                sync_ticker(ticker)
                return {
                    "statusCode": 200,
                    "body": json.dumps({"status": "success", "message": f"Synced {ticker}", "data": data}, default=str)
                }
            else:
                return {
                    "statusCode": 404,
                    "body": json.dumps({"status": "error", "message": "Ticker not found or data error"})
                }
        else:
            return {
                "statusCode": 400,
                "body": json.dumps({"status": "error", "message": "Missing 'ticker' query parameter"})
            }

    except Exception as e:
        logger.error(f"Handler Error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"status": "error", "message": str(e)})
        }


def run_daemon(interval_seconds=60):
    """
    Run the sync process in a continuous loop.
    """
    logger.info(f"Starting Stock Data Service in DAEMON mode (Interval: {interval_seconds}s)")
    
    # Load ticker list once
    json_path = os.path.join(os.path.dirname(__file__), '../src/data/stocks.json')
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            stocks_list = json.load(f)
    except FileNotFoundError:
        logger.error(f"Stocks file not found at {json_path}. Run generate_stock_list.py first.")
        return

    import time
    
    while True:
        logger.info("Starting batch sync...")
        start_time = datetime.now()
        
        for idx, stock_item in enumerate(stocks_list):
            ticker = stock_item['ticker']
             # Optional: detailed logging or keep it quiet
            if idx % 50 == 0:
                logger.info(f"[{idx}/{len(stocks_list)}] Syncing {stock_item['name']}...")
            
            sync_ticker(ticker)
            
            # Small sleep to be polite to the source if needed, though sequential is already slow enough
            # time.sleep(0.1) 
        
        duration = datetime.now() - start_time
        logger.info(f"Batch sync completed in {duration}. Sleeping for {interval_seconds} seconds...")
        time.sleep(interval_seconds)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        
        if arg == '--sync-all':
            # Load ticker list from ../src/data/stocks.json
            json_path = os.path.join(os.path.dirname(__file__), '../src/data/stocks.json')
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    stocks_list = json.load(f)
                
                print(f"Found {len(stocks_list)} stocks. Starting full sync...")
                
                for idx, stock_item in enumerate(stocks_list):
                    ticker = stock_item['ticker']
                    # Optional: Progress logging
                    if idx % 10 == 0:
                        print(f"[{idx}/{len(stocks_list)}] Processing {stock_item['name']} ({ticker})...")
                    
                    sync_ticker(ticker)
                    
            except FileNotFoundError:
                logger.error(f"Stocks file not found at {json_path}. Run generate_stock_list.py first.")
        
        elif arg == '--daemon':
            # Run in daemon mode
            run_daemon()
            
        else:
            # CLI usage: python main.py 005930.KS
            ticker_arg = sys.argv[1]
            sync_ticker(ticker_arg)
    else:
        print("Usage: python main.py <ticker> | --sync-all | --daemon")
