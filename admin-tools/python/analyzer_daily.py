
import sqlite3
import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
import requests

# Logging Setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Config
DB_PATH = os.path.join(os.path.dirname(__file__), '../../dailyport.db')
TODAY = datetime.now().strftime("%Y-%m-%d") # Supabase ISO Format
TODAY_DB = datetime.now().strftime("%Y%m%d") # SQLite Format

# Load Env
env_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '../.env.local')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '../../.env.local')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

def get_db_cursor():
    return conn.cursor()



def analyze_technicals_bulk(rows):
    """
    Rows: List of SQLite rows (date, close) ordered by date DESC
    """
    count = len(rows)
    if count < 5:
        return {"signal": "NEUTRAL", "summary": "데이터 부족 (5일 미만)", "trend": "NEUTRAL", "ma5": None, "ma20": None}
        
    closes = [r["close"] for r in rows] # Newest first
    ma5 = sum(closes[:5]) / 5
    
    # Optional MA20
    ma20 = sum(closes[:20]) / 20 if count >= 20 else ma5
    
    # Prev values for cross detection
    if count >= 21:
        prev_ma5 = sum(closes[1:6]) / 5
        prev_ma20 = sum(closes[1:21]) / 20
        
        # Golden Cross
        if prev_ma5 < prev_ma20 and ma5 >= ma20:
            return {"signal": "BUY", "summary": "✨ 5일선이 20일선을 돌파했습니다 (골든크로스)", "trend": "UP_TREND", "ma5": ma5, "ma20": ma20}
        # Dead Cross
        elif prev_ma5 > prev_ma20 and ma5 <= ma20:
            return {"signal": "SELL", "summary": "⚠️ 5일선이 20일선을 하향 이탈했습니다 (데드크로스)", "trend": "DOWN_TREND", "ma5": ma5, "ma20": ma20}
    
    # Fallback status
    status = "UP_TREND" if ma5 >= ma20 else "DOWN_TREND"
    summary = f"단기 이평선({ma5:,.0f}원) {'상향' if status == 'UP_TREND' else '하향'}세"
    if count < 20:
        summary += " (20일 데이터 부족)"
        
    return {
        "signal": "NEUTRAL", 
        "summary": summary, 
        "trend": status,
        "ma5": ma5, 
        "ma20": ma20 if count >= 20 else None
    }

def process_watchlist(tickers):
    """
    Analyze user's interested tickers and upload reports.
    Optimized: Bulk fetch and group in memory.
    """
    if not tickers:
        return

    # Normalize tickers (strip .KS, .KQ) for SQLite lookup
    normalized_tickers = list(set([t.split('.')[0] for t in tickers]))
    cur = get_db_cursor()
    
    # Bulk fetch price and supply data for all tickers at once
    placeholders = ','.join(['?'] * len(normalized_tickers))
    
    price_sql = f"""
        SELECT code, date, close, market_cap, per, pbr
        FROM daily_price 
        WHERE code IN ({placeholders})
        ORDER BY code, date DESC
    """
    
    supply_sql = f"""
        SELECT code, date, foreigner, institution 
        FROM daily_supply
        WHERE code IN ({placeholders})
        ORDER BY code, date DESC
    """
    
    try:
        cur.execute(price_sql, normalized_tickers)
        price_rows = cur.fetchall()
        
        cur.execute(supply_sql, normalized_tickers)
        supply_rows = cur.fetchall()
        
            # Group by code
        price_map = {}
        for r in price_rows:
            if r["code"] not in price_map: price_map[r["code"]] = []
            price_map[r["code"]].append(dict(r))
            
        supply_map = {}
        for r in supply_rows:
            if r["code"] not in supply_map: supply_map[r["code"]] = []
            supply_map[r["code"]].append(dict(r))
            
        reports = []
        for code in normalized_tickers:
            p_history = price_map.get(code, [])
            s_history = supply_map.get(code, [])
            
            if not p_history: continue
            
            # 1. Technical Analysis
            tech = analyze_technicals_bulk(p_history[:200])
            
            # 2. Supply Analysis (Extended to 200 days)
            # Create a quick date -> close map
            c_map = {p["date"]: p["close"] for p in p_history[:200]}
            supply_chart = []
            
            # Calculate accumulation metrics
            f_net_5 = sum(s["foreigner"] for s in s_history[:5])
            i_net_5 = sum(s["institution"] for s in s_history[:5])
            f_net_20 = sum(s["foreigner"] for s in s_history[:20])
            i_net_20 = sum(s["institution"] for s in s_history[:20])
            
            for s in reversed(s_history[:200]):
                supply_chart.append({
                    "date": s["date"],
                    "foreigner": s["foreigner"],
                    "institution": s["institution"],
                    "close": c_map.get(s["date"])
                })
            
            # 3. Fundamentals (Calculated from latest price data)
            latest_p = p_history[0] if p_history else {}
            
            report = {
                "date": TODAY,
                "ticker": code,
                "report_data": {
                    "signal": tech["signal"],
                    "summary": tech["summary"],
                    "trend": tech.get("trend", "NEUTRAL"),
                    "ma5": tech.get("ma5"),
                    "ma20": tech.get("ma20"),
                    "supply_chart": supply_chart,
                    "metrics": {
                        "foreigner_5d_net": f_net_5,
                        "institution_5d_net": i_net_5,
                        "foreigner_20d_net": f_net_20,
                        "institution_20d_net": i_net_20
                    },
                    "fundamentals": {
                        "market_cap": latest_p.get("market_cap"),
                        "per": latest_p.get("per"),
                        "pbr": latest_p.get("pbr")
                    }
                }
            }
            reports.append(report)

        # Change on_conflict to "ticker" only to keep only the latest report in Supabase
        if reports: # Only upsert if there are reports to avoid empty payload errors
            supabase.table("daily_analysis_reports").upsert(reports, on_conflict="ticker").execute()
            logger.info(f"✅ Uploaded {len(reports)} detailed reports to Supabase (Latest Only).")
            
    except Exception as e:
        logger.error(f"Watchlist processing failed: {e}")

def run_algo_screening():
    """
    Filter all stocks for specific strategies (Algo Picks).
    Optimized queries and execution flow.
    """
    logger.info("🕵️ Running Algorithm Screening (Algo Picks)...")
    cur = get_db_cursor()
    
    # Get latest data dates efficiently
    cur.execute("SELECT MAX(date) FROM daily_price")
    max_price_date = cur.fetchone()[0]
    
    cur.execute("SELECT MAX(date) FROM daily_supply")
    max_supply_date = cur.fetchone()[0]

    if not max_price_date:
        logger.warning("No data found in DB. Skipping Algo Screening.")
        return

    # Strategy 1: Value Picks (High Quality)
    # V2: Market Cap >= 100B, 5D Avg Vol >= 1B, ROE >= 10, Op Margin >= 5, PBR < 1.1, PER < 12
    # Also exclude inactive/admin stocks via Join.
    
    cur.execute("""
        SELECT p.code FROM daily_price p
        JOIN tickers t ON p.code = t.code
        WHERE p.date = ?
        AND t.is_active = 1
        AND p.per > 0 AND p.per < 12
        AND p.pbr > 0.3 AND p.pbr < 1.1
        AND p.roe >= 10            
        AND p.operating_margin >= 5 
        AND p.market_cap >= 100000000000 
        AND (
            SELECT AVG(trading_value) FROM daily_price p2 
            WHERE p2.code = p.code AND p2.date <= p.date 
            ORDER BY date DESC LIMIT 5
        ) >= 1000000000
        ORDER BY p.per ASC, p.pbr ASC
        LIMIT 15
    """, (max_price_date,))
    value_picks = [r[0] for r in cur.fetchall()]
    
    # Strategy 2: Twin Engines
    # V2: Supply Intensity >= 0.05%, Continuity 2/3, Entry < 20MA + 10%, Mcap > 100B
    
    cur.execute("""
        SELECT s.code, s.foreigner, s.institution, p.market_cap, p.close, p.operating_margin
        FROM daily_supply s
        JOIN daily_price p ON s.code = p.code AND s.date = p.date
        JOIN tickers t ON s.code = t.code
        WHERE s.date = ?
        AND t.is_active = 1
        AND s.foreigner > 0 AND s.institution > 0
        AND p.market_cap >= 100000000000
        AND p.operating_margin >= 0 
        AND (
            SELECT AVG(trading_value) FROM daily_price p2 
            WHERE p2.code = p.code AND p2.date <= p.date 
            ORDER BY date DESC LIMIT 5
        ) >= 1000000000
        ORDER BY (s.foreigner + s.institution) DESC
        LIMIT 100
    """, (max_supply_date,))
    
    raw_twin_candidates = [dict(r) for r in cur.fetchall()]
    twin_picks = []
    
    for cand in raw_twin_candidates:
        code = cand['code']
        mcap = cand['market_cap'] or 1
        total_buy = cand['foreigner'] + cand['institution']
        
        # 1. Intensity Check (0.05% of Mcap)
        # Note: buy amount is in Won? Schema says 'individual', 'foreigner' are INTEGER. Code says "Net Buy Volume/Value".
        # PyKRX `get_market_net_purchases` usually returns Amount in Won.
        # Let's assume Won.
        intensity = (total_buy / mcap) * 100
        if intensity < 0.05:
            continue
            
        # 2. Continuity Check (2 of last 3 days)
        # Fetch last 3 days supply
        cur.execute("""
            SELECT foreigner, institution FROM daily_supply 
            WHERE code = ? AND date <= ? 
            ORDER BY date DESC LIMIT 3
        """, (code, max_supply_date))
        hist = cur.fetchall()
        buy_days = sum(1 for h in hist if (h['foreigner'] + h['institution']) > 0)
        if buy_days < 2:
            continue
            
        # 3. Entry Check (Price < 20MA * 1.1)
        # Fetch recent prices for MA calculation
        cur.execute("""
            SELECT close FROM daily_price
            WHERE code = ? AND date <= ?
            ORDER BY date DESC LIMIT 20
        """, (code, max_price_date))
        closes = [r['close'] for r in cur.fetchall()]
        if len(closes) < 20: continue
        ma20 = sum(closes) / 20
        if cand['close'] > ma20 * 1.1:
            continue
            
        twin_picks.append(code)
        if len(twin_picks) >= 15: break

    # Strategy 3: Foreigner Accumulation (Smart Money)
    # V2: Box Compression < 10%, Price Support > 60MA/120MA, Vol Drying, Mcap > 100B
    
    # We need EMA/MA for "Price Support". Let's fetch candidates filtering by Box & Vol first.
    sql_accumulation = """
        WITH RecentSupply AS (
            SELECT code, SUM(foreigner) as f_sum
            FROM daily_supply
            WHERE date >= strftime('%Y%m%d', 'now', '-21 days')
            GROUP BY code
            HAVING f_sum > 0
        ),
        RecentStats AS (
            SELECT code, 
                   MAX(close) as h_price, 
                   MIN(close) as l_price,
                   AVG(volume) as avg_vol_20,
                   MAX(operating_margin) as op_margin,
                   MAX(market_cap) as mcap,
                   MAX(trading_value) as t_val
            FROM daily_price
            WHERE date >= strftime('%Y%m%d', 'now', '-21 days')
            GROUP BY code
            HAVING COUNT(*) >= 15
        ),
        Recent5Day AS (
            SELECT code, AVG(volume) as avg_vol_5
            FROM daily_price
            WHERE date >= strftime('%Y%m%d', 'now', '-5 days')
            GROUP BY code
        )
        SELECT s.code, p.op_margin, p.mcap
        FROM RecentSupply s
        JOIN RecentStats p ON s.code = p.code
        JOIN Recent5Day v5 ON s.code = v5.code
        WHERE (p.h_price - p.l_price) / p.l_price < 0.10     -- Box Compression
        AND v5.avg_vol_5 < p.avg_vol_20                       -- Volume Drying
        AND p.op_margin > 0                                   -- Quality
        AND p.mcap >= 100000000000                            -- Global Mcap
        AND p.t_val >= 1000000000                             -- Global Liq
        ORDER BY s.f_sum DESC
        LIMIT 50
    """
    acc_candidates = []
    try:
        cur.execute(sql_accumulation)
        acc_candidates = [dict(r) for r in cur.fetchall()]
    except Exception as e:
        logger.error(f"Accumulation query failed: {e}")

    acc_picks = []
    for cand in acc_candidates:
        code = cand['code']
        # 4. Price Support (Current > 60MA or 120MA)
        cur.execute("SELECT close FROM daily_price WHERE code = ? ORDER BY date DESC LIMIT 120", (code,))
        hist_closes = [r[0] for r in cur.fetchall()]
        if len(hist_closes) < 60: continue
        
        curr_price = hist_closes[0]
        ma60 = sum(hist_closes[:60]) / 60
        ma120 = sum(hist_closes) / 120 if len(hist_closes) >= 120 else ma60
        
        if curr_price > ma60 or curr_price > ma120:
            acc_picks.append(code)
            if len(acc_picks) >= 15: break

    # Strategy 4: Trend Following
    # V2: Vol Spike > 1.5x, RSI < 70, Upper Wick < Body, Op Margin > -5, Mcap > 100B
    
    cur.execute("""
        SELECT p.code, p.close, p.open, p.high, p.low, p.volume, p.operating_margin
        FROM daily_price p
        WHERE p.date = ?
        AND p.market_cap >= 100000000000
        AND p.trading_value >= 1000000000
        AND p.operating_margin > -5
        AND p.close > p.open 
    """, (max_price_date,))
    
    trend_candidates = [dict(r) for r in cur.fetchall()]
    trend_picks = []
    
    for cand in trend_candidates:
        code = cand['code']
        high = cand['high']
        low = cand['low']
        open_p = cand['open']
        close = cand['close']
        vol = cand['volume']
        
        # 1. Wick Check (Upper Wick < Body)
        # Body = Close - Open (Green)
        # Upper Wick = High - Close
        body = close - open_p
        upper_wick = high - close
        if body == 0: continue
        if upper_wick >= body:
            continue # Selling pressure too high
            
        # 2. Volume Spike (> 1.5x 20MA Vol)
        cur.execute("""
            SELECT volume FROM daily_price 
            WHERE code = ? AND date < ? 
            ORDER BY date DESC LIMIT 20
        """, (code, max_price_date))
        v_hist = [r[0] for r in cur.fetchall()]
        if not v_hist: continue
        avg_vol_20 = sum(v_hist) / len(v_hist)
        
        if vol <= avg_vol_20 * 1.5:
            continue
            
        # 3. RSI Check (< 70)
        # Fetch 15 days of closes (14 changes)
        cur.execute("""
            SELECT close FROM daily_price 
            WHERE code = ? AND date <= ? 
            ORDER BY date DESC LIMIT 15
        """, (code, max_price_date))
        rsi_hist = [r[0] for r in cur.fetchall()]
        rsi_hist.reverse() # Oldest first
        
        if len(rsi_hist) >= 15:
            # Simple RSI calculation
            gains = []
            losses = []
            for i in range(1, len(rsi_hist)):
                delta = rsi_hist[i] - rsi_hist[i-1]
                if delta > 0:
                    gains.append(delta)
                    losses.append(0)
                else:
                    gains.append(0)
                    losses.append(abs(delta))
            
            avg_gain = sum(gains) / 14
            avg_loss = sum(losses) / 14
            
            if avg_loss == 0:
                rsi = 100
            else:
                rs = avg_gain / avg_loss
                rsi = 100 - (100 / (1 + rs))
                
            if rsi > 70:
                continue # Overbought
        
        trend_picks.append(code)
        if len(trend_picks) >= 15: break
    
    picks_payload = [
        {"date": TODAY, "strategy_name": "Value_Picks", "tickers": value_picks},
        {"date": TODAY, "strategy_name": "Twin_Engines", "tickers": twin_picks},
        {"date": TODAY, "strategy_name": "Foreigner_Accumulation", "tickers": acc_picks},
        {"date": TODAY, "strategy_name": "Trend_Following", "tickers": trend_picks}
    ]
    
    try:
        # Change table name to "algo_picks" and use strategy_name for latest-only policy
        supabase.table("algo_picks").upsert(picks_payload, on_conflict="strategy_name").execute()
        logger.info(f"✅ Uploaded Algo Picks to 'algo_picks' table (Latest Only)")
        
        # Send Notification
        notify_telegram(len(value_picks), len(twin_picks), len(acc_picks), len(trend_picks), twin_picks)

    except Exception as e:
        logger.error(f"Algo Upload Error: {e}")
    
    return list(set(value_picks + twin_picks + acc_picks + trend_picks))

def get_telegram_settings_from_db():
    """
    Fetch Telegram credentials from Supabase user_settings table.
    """
    try:
        response = supabase.table("user_settings").select("telegram_chat_id, telegram_bot_token").limit(1).execute()
        if response.data:
            settings = response.data[0]
            return settings.get("telegram_chat_id"), settings.get("telegram_bot_token")
    except Exception as e:
        logger.warning(f"Failed to fetch Telegram settings: {e}")
    return None, None

def notify_telegram(value_count, twin_count, acc_count, trend_count, twin_tickers):
    """
    Send a summary message to Telegram.
    """
    db_chat_id, db_token = get_telegram_settings_from_db()
    token = db_token or os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = db_chat_id or os.getenv("TELEGRAM_CHAT_ID")
    
    if not token or not chat_id:
        logger.warning("Telegram credentials missing. Skipping notification.")
        return

    # Link to production URL if possible, otherwise localhost
    site_url = os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")
    
    ticker_list_str = ', '.join(twin_tickers[:5]) if twin_tickers else 'None'
    message = f"""
🚀 *DailyPort 알고리즘 분석 완료* ({TODAY})

🔍 *알고리즘 픽 요약*:
• 💎 저평가(Value): {value_count}개
• 🐯 기관/외인 동반매수: {twin_count}개
• 🥪 외국인 매집/횡보: {acc_count}개
• 📈 추세추종(Trend): {trend_count}개

🔥 *동반매수 주요 종목*:
`{ticker_list_str}`

[대시보드 바로가기]({site_url}/algo-picks)
"""
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {"chat_id": chat_id, "text": message, "parse_mode": "Markdown"}
        requests.post(url, json=payload, timeout=5)
        logger.info(f"📨 Telegram notification sent.")
    except Exception as e:
        logger.error(f"Telegram Error: {e}")

if __name__ == "__main__":
    logger.info("🚀 Starting Daily Analyzer...")
    
    # 1. Fetch Tickers from Supabase (Watchlist + Portfolio)
    all_tickers = []
    try:
        # Fetch tickers from watchlists and portfolios
        watchlist_res = supabase.table("watchlists").select("ticker").execute()
        portfolio_res = supabase.table("portfolios").select("ticker").execute()
        
        watchlist_tickers = [r["ticker"] for r in watchlist_res.data] if watchlist_res.data else []
        portfolio_tickers = [r["ticker"] for r in portfolio_res.data] if portfolio_res.data else []
        
        # Merge and deduplicate
        all_tickers = list(set(watchlist_tickers + portfolio_tickers))
        
        logger.info(f"Found {len(watchlist_tickers)} watchlist tickers, {len(portfolio_tickers)} portfolio tickers")
        logger.info(f"Total unique tickers to analyze: {len(all_tickers)}")
            
    except Exception as e:
        logger.warning(f"Failed to fetch tickers from DB: {e}")
        
    # Fallback to defaults if empty
    if not all_tickers:
        all_tickers = ["005930", "000660", "035420", "035720"]
        logger.info("Using default tickers as no tickers found in Supabase.")
    
    # 2. Add Algo Picks to the queue
    algo_tickers = run_algo_screening()
    
    # Merge and deduplicate
    all_tickers = list(set(all_tickers + algo_tickers))
    logger.info(f"Final analysis queue: {len(all_tickers)} unique tickers")
    
    # 3. Process all
    process_watchlist(all_tickers)
    
    conn.close()
    logger.info("🎉 Analyzer Finished.")
