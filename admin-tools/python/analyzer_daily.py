
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
    if len(rows) < 20:
        return {"signal": "NEUTRAL", "summary": "데이터 부족 (20일 미만)"}
        
    closes = [r["close"] for r in rows] # Newest first
    
    ma5 = sum(closes[:5]) / 5
    ma20 = sum(closes[:20]) / 20
    
    prev_ma5 = sum(closes[1:6]) / 5
    prev_ma20 = sum(closes[1:21]) / 20
    
    signal = "NEUTRAL"
    summary = "특이사항 없음"
    
    # Golden Cross
    if prev_ma5 < prev_ma20 and ma5 >= ma20:
        signal = "BUY"
        summary = "✨ 5일선이 20일선을 돌파했습니다 (골든크로스)"
    # Dead Cross
    elif prev_ma5 > prev_ma20 and ma5 <= ma20:
        signal = "SELL"
        summary = "⚠️ 5일선이 20일선을 하향 이탈했습니다 (데드크로스)"
    
    # Trend Check
    status = "UP_TREND" if ma5 > ma20 else "DOWN_TREND"
        
    return {
        "signal": signal, 
        "summary": summary, 
        "trend": status,
        "ma5": ma5, 
        "ma20": ma20
    }

def process_watchlist(tickers):
    """
    Analyze user's interested tickers and upload reports.
    Optimized: Bulk fetch and group in memory.
    """
    if not tickers:
        return

    logger.info(f"Processing Watchlist: {len(tickers)} tickers")
    cur = get_db_cursor()
    
    # Bulk fetch price and supply data for all tickers at once
    # Limit history to 60 days to cover MA20 and supply charts (30d)
    placeholders = ','.join(['?'] * len(tickers))
    
    price_sql = f"""
        SELECT code, date, close 
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
        cur.execute(price_sql, tickers)
        price_rows = cur.fetchall()
        
        cur.execute(supply_sql, tickers)
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
        for code in tickers:
            p_history = price_map.get(code, [])
            s_history = supply_map.get(code, [])
            
            if not p_history: continue
            
            # 1. Technical Analysis
            tech = analyze_technicals_bulk(p_history[:60])
            
            # 2. Supply Chart Data (Merge Close from price_map)
            # Create a quick date -> close map
            c_map = {p["date"]: p["close"] for p in p_history[:40]}
            supply_chart = []
            for s in reversed(s_history[:30]):
                supply_chart.append({
                    "date": s["date"],
                    "foreigner": s["foreigner"],
                    "institution": s["institution"],
                    "close": c_map.get(s["date"])
                })
            
            report = {
                "date": TODAY,
                "ticker": code,
                "report_data": {
                    "signal": tech["signal"],
                    "summary": tech["summary"],
                    "trend": tech.get("trend", "NEUTRAL"),
                    "ma5": tech.get("ma5"),
                    "ma20": tech.get("ma20"),
                    "supply_chart": supply_chart
                }
            }
            reports.append(report)

        if reports:
            supabase.table("daily_analysis_reports").upsert(reports, on_conflict="date, ticker").execute()
            logger.info(f"✅ Uploaded {len(reports)} reports to Supabase.")
            
    except Exception as e:
        logger.error(f"Watchlist processing failed: {e}")

def run_guru_screening():
    """
    Filter all stocks for specific strategies.
    Optimized queries and execution flow.
    """
    logger.info("🕵️ Running Guru Screening...")
    cur = get_db_cursor()
    
    # Get latest data dates efficiently
    cur.execute("SELECT MAX(date) FROM daily_price")
    max_price_date = cur.fetchone()[0]
    
    cur.execute("SELECT MAX(date) FROM daily_supply")
    max_supply_date = cur.fetchone()[0]

    if not max_price_date:
        logger.warning("No data found in DB. Skipping Guru Screening.")
        return

    # Strategy 1: Low PER & PBR (Value Picks)
    cur.execute("""
        SELECT code FROM daily_price 
        WHERE date = ?
        AND per > 0 AND per < 12
        AND pbr > 0.3 AND pbr < 1.1 
        ORDER BY per ASC, pbr ASC
        LIMIT 15
    """, (max_price_date,))
    value_picks = [r["code"] for r in cur.fetchall()]
    
    # Strategy 2: Twin Engines (Solid Short-term)
    cur.execute("""
        SELECT code 
        FROM daily_supply
        WHERE date = ?
        AND foreigner > 0 AND institution > 0
        ORDER BY (foreigner + institution) DESC
        LIMIT 15
    """, (max_supply_date,))
    twin_picks = [r["code"] for r in cur.fetchall()]

    # Strategy 3: Foreigner Accumulation (Smart Money)
    sql_accumulation = """
        WITH RecentSupply AS (
            SELECT code, SUM(foreigner) as f_sum
            FROM daily_supply
            WHERE date >= strftime('%Y%m%d', 'now', '-21 days')
            GROUP BY code
            HAVING f_sum > 0
        ),
        RecentPrice AS (
            SELECT code, 
                   MAX(close) as h_price, 
                   MIN(close) as l_price,
                   COUNT(*) as days
            FROM daily_price
            WHERE date >= strftime('%Y%m%d', 'now', '-21 days')
            GROUP BY code
            HAVING days >= 10
        )
        SELECT s.code
        FROM RecentSupply s
        JOIN RecentPrice p ON s.code = p.code
        WHERE (p.h_price - p.l_price) / p.l_price < 0.12 -- Consolidation range
        ORDER BY s.f_sum DESC
        LIMIT 15
    """
    try:
        cur.execute(sql_accumulation)
        acc_picks = [r["code"] for r in cur.fetchall()]
    except Exception as e:
        logger.error(f"Accumulation query failed: {e}")
        acc_picks = []

    # Strategy 4: Trend Following (추세추종)
    # Price > MA20 > MA60 (Bullish Alignment) + Close near recent high
    sql_trend = """
        WITH MA_Data AS (
            SELECT code, 
                   close,
                   AVG(close) OVER (PARTITION BY code ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as ma20,
                   AVG(close) OVER (PARTITION BY code ORDER BY date ROWS BETWEEN 59 PRECEDING AND CURRENT ROW) as ma60,
                   MAX(close) OVER (PARTITION BY code ORDER BY date ROWS BETWEEN 119 PRECEDING AND CURRENT ROW) as h120,
                   date
            FROM daily_price
        )
        SELECT code
        FROM MA_Data
        WHERE date = ?
        AND close > ma20
        AND ma20 > ma60
        AND close > h120 * 0.9 -- Within 10% of 6-month high
        ORDER BY (close - ma60) / ma60 DESC -- Momentum strength
        LIMIT 15
    """
    try:
        cur.execute(sql_trend, (max_price_date,))
        trend_picks = [r["code"] for r in cur.fetchall()]
    except Exception as e:
        logger.error(f"Trend Following query failed: {e}")
        trend_picks = []
    
    picks_payload = [
        {"date": TODAY, "strategy_name": "Value_Picks", "tickers": value_picks},
        {"date": TODAY, "strategy_name": "Twin_Engines", "tickers": twin_picks},
        {"date": TODAY, "strategy_name": "Foreigner_Accumulation", "tickers": acc_picks},
        {"date": TODAY, "strategy_name": "Trend_Following", "tickers": trend_picks}
    ]
    
    try:
        supabase.table("guru_picks").upsert(picks_payload, on_conflict="date, strategy_name").execute()
        logger.info(f"✅ Uploaded Algo Picks: Value({len(value_picks)}), Twin({len(twin_picks)}), Acc({len(acc_picks)}), Trend({len(trend_picks)})")
        
        # Send Notification
        notify_telegram(len(value_picks), len(twin_picks), len(acc_picks), len(trend_picks), twin_picks)

    except Exception as e:
        logger.error(f"Algo Upload Error: {e}")

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
    
    # 1. Fetch Watchlist from Supabase (instead of mock)
    try:
        # Fetch unique tickers from all watchlists
        res = supabase.table("watchlists").select("ticker").execute()
        # Fallback to defaults if empty
        my_tickers = list(set([r['ticker'] for r in res.data])) if res.data else ["005930", "000660", "035420", "035720"]
    except Exception as e:
        logger.warning(f"Failed to fetch watchlists from DB: {e}")
        my_tickers = ["005930", "000660", "035420", "035720"]
    
    process_watchlist(my_tickers)
    run_guru_screening()
    
    conn.close()
    logger.info("🎉 Analyzer Finished.")
