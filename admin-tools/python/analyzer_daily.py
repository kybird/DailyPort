
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

# --- Algo Picks Refinement (v5) Infrastructure ---
# Strategy Metadata & Groups
STRATEGY_META = {
    "Value_Picks": {
        "id": "Value_Picks",
        "group": "Fundamental",
        "tags": ["저평가", "우량주"],
        "description": "저평가 우량주: ROE 10%↑, 영업이익률 5%↑ 고배당/저PBR 기업",
        "mcap_override": None,
        "version": "v5.0"
    },
    "Twin_Engines": {
        "id": "Twin_Engines",
        "group": "Flow",
        "tags": ["수급강도", "동반매수"],
        "description": "쌍끌이 매수: 외인/기관 합산 수급강도(0.05%↑) 및 2/3일 연속 매수",
        "mcap_override": 300000000000, # 3,000억
        "version": "v5.0"
    },
    "Foreigner_Accumulation": {
        "id": "Foreigner_Accumulation",
        "group": "Flow",
        "tags": ["외인매집", "박스권"],
        "description": "외인 매집: 박스권(변동폭 10%↓) 내 외인 비중 증가 및 이평선 지지",
        "mcap_override": None,
        "version": "v5.0"
    },
    "Trend_Following": {
        "id": "Trend_Following",
        "group": "Price",
        "tags": ["추세추종", "이평선정배열"],
        "description": "추세추종: 거래폭발(1.5x↑) 및 이평선 정배열(MA5>20) 초기 돌파",
        "mcap_override": None,
        "version": "v5.1"
    }
}

GROUP_WEIGHT = {
    "Flow": 1.0,
    "Price": 1.0,
    "Fundamental": 1.0
}

# Targeted Debugging
DEBUG_TICKERS = [] # Add tickers like "005930" to debug filtration
IS_PROD = os.getenv("NODE_ENV") == "production"

def validate_meta():
    """Verify all strategies in meta have a corresponding implementation logic later."""
    required_strategies = ["Value_Picks", "Twin_Engines", "Foreigner_Accumulation", "Trend_Following"]
    for s_id in required_strategies:
        if s_id not in STRATEGY_META:
            msg = f"CRITICAL: Strategy Meta missing for {s_id}"
            if not IS_PROD:
                assert False, msg
            else:
                logger.warning(msg)

validate_meta()
# ------------------------------------------------

def get_db_cursor():
    return conn.cursor()



def calculate_objectives_v3(current_price, history_rows):
    """
    Python implementation of Trading Objective V3 §7, §8, §9
    history_rows: newest first (close, high, low)
    """
    if len(history_rows) < 20:
        return None
        
    # Partial History Handler (20 ~ 119 days)
    # Return a safe "WAIT" status instead of None so UI works
    if len(history_rows) < 120:
        # Create a dummy "WAIT" objective
        dummy_obj = {
            "status": "WAIT",
            "score": 0,
            "strategy": "NO_TRADE",
            "confidenceFlags": ["TREND_WEAK"],
            "reason": "데이터 부족으로 정밀 분석 불가 (신규 상장 등)",
            "entry": None, "stop": None, "target": None, "rr": 0
        }
        return {
            "short": dummy_obj,
            "mid": dummy_obj,
            "long": dummy_obj,
            "is_abnormal": True
        }

    closes = [r["close"] for r in history_rows]
    highs = [r["high"] for r in history_rows]
    lows = [r["low"] for r in history_rows]

    def sma(period):
        if len(closes) < period: return None
        return sum(closes[:period]) / period

    def atr(period=14):
        if len(history_rows) < period + 1: return None
        tr_sum = 0
        for i in range(period):
            h, l, pc = highs[i], lows[i], closes[i+1]
            tr = max(h - l, abs(h - pc), abs(l - pc))
            tr_sum += tr
        return tr_sum / period

    def rsi(period=14):
        if len(closes) < period + 1: return 50
        deltas = [closes[i] - closes[i+1] for i in range(period)]
        gains = sum([d for d in deltas if d > 0]) / period
        losses = sum([abs(d) for d in deltas if d < 0]) / period
        if losses == 0: return 100
        return 100 - (100 / (1 + (gains / losses)))

    def find_swing_lows(window=5):
        if len(lows) < window * 2 + 1: return []
        sw = []
        for i in range(window, len(lows) - window):
            curr = lows[i]
            if curr <= min(lows[i-window:i]) and curr <= min(lows[i+1:i+1+window]):
                sw.append(curr)
        return sw

    def find_swing_highs(window=5):
        if len(highs) < window * 2 + 1: return []
        sw = []
        for i in range(window, len(highs) - window):
            curr = highs[i]
            if curr >= max(highs[i-window:i]) and curr >= max(highs[i+1:i+1+window]):
                sw.append(curr)
        return sorted(list(set(sw)))

    def ema(period):
        if len(closes) < period: return None
        k = 2 / (period + 1)
        # Initialize with SMA
        val = sum(closes[:period]) / period
        # Calculate EMA for the rest
        # (This is a simplified EMA on limited window, for robustness on 200 days data, it's acceptable)
        # Ideally we want recursion from start, but iterating 200 rows is fast enough.
        # Let's do a proper iterative calc from the oldest available data point up to now?
        # Given `closes` is newest first (index 0 is today), we should reverse to calculate.
        
        data_rev = closes[::-1] # Oldest first
        if len(data_rev) < period: return None
        
        # Start SMA at the point where we have enough data
        # Actually standard EMA usually starts with first value or SMA of first N.
        # Simple approximation: Start with SMA of first 'period' items in history
        initial_sma = sum(data_rev[:period]) / period
        val = initial_sma
        for price in data_rev[period:]:
            val = price * k + val * (1 - k)
        return val

    # Step 0: Indicators
    ma5, ma10, ma20, ma60, ma120 = sma(5), sma(10), sma(20), sma(60), sma(120)
    ema5, ema20 = ema(5), ema(20)
    
    current_atr = atr(14)
    current_rsi = rsi(14)
    recent_high = max(highs[:min(len(highs), 60)])
    
    # Swing Lows & Prev Low
    swing_lows = find_swing_lows(5)
    prev_low = lows[1] if len(lows) > 1 else None
    recent_low_10 = min(lows[:10]) if len(lows) >= 10 else min(lows)

    def solve(timeframe):
        # Only implementing the 'short' timeframe logic for Daily Insight relevance
        # But keeping structure for others if needed.
        
        # === Step 1: Edge Cases ===
        if current_rsi > 75:
            return {
                "status": "WAIT",
                "score": 40,
                "strategy": "NO_TRADE",
                "confidenceFlags": ["OVERBOUGHT"],
                "reason": f"과열 구간 - 단기 조정 가능성 (RSI {int(current_rsi)})",
                "entry": None, "stop": None, "target": None
            }
        
        if current_rsi < 25:
             return {
                "status": "WAIT",
                "score": 40,
                "strategy": "MEAN_REVERSION",
                "confidenceFlags": ["OVERSOLD"],
                "reason": f"과매도 - 반등 가능성 (신중 접근)",
                "entry": None, "stop": None, "target": None
            }

        # === Step 2: Trend Determination ===
        # Using refined criteria
        is_uptrend = (ema20 and ma60 and ema20 > ma60) and (ema20 and current_price > ema20)
        is_downtrend = (ema20 and ma60 and ema20 < ma60) and (ma60 and current_price < ma60)
        is_sideways = not is_uptrend and not is_downtrend

        # === Step 3: Best Support Selection ===
        # Candidates: EMA5, EMA20, PrevLow, RecentLow10, SwingLows
        # Note: EMA5/20 might be None if short history
        candidates = []
        if ema5: candidates.append(('EMA5', ema5))
        if ema20: candidates.append(('EMA20', ema20))
        if prev_low: candidates.append(('전일저가', prev_low))
        if recent_low_10: candidates.append(('최근저점', recent_low_10))
        # Add a couple significant swing lows
        for sl in swing_lows[-2:]:
             candidates.append(('직전저점', sl))

        # Filter: Only supports BELOW current price
        # Edge Case: Panic Drop check inside here
        supports = [c for c in candidates if c[1] < current_price]
        
        if not supports:
            # === Edge Case 3: Panic Drop (All supports broken) ===
            # Find closest resistance instead
            resistances = sorted([c for c in candidates if c[1] > current_price], key=lambda x: x[1])
            rec_level = resistances[0][1] if resistances else current_price
            return {
                "status": "AVOID",
                "score": 20,
                "strategy": "NO_TRADE",
                "confidenceFlags": ["PANIC_DROP"],
                "reason": f"급락 중 - ₩{int(rec_level):,} ({resistances[0][0] if resistances else '저항'}) 회복 필요",
                "entry": None, "stop": None, "target": None
            }

        # Selection Rule (3% Rule)
        # If any support is within 3%, pick closest. Else pick closest (conceptually highest).
        highest_support = max(supports, key=lambda x: x[1]) # Closest to price from below
        
        # Check if there is a 'close' support (within 3%)
        # Actually logic says: "If 3% valid exists, pick closest. Else pick closest." 
        # So in both cases we pick the 'closest to current price' (which is max value among supports < price).
        # We just need it to calculate Gap.
        
        best_sup_name, best_sup_price = highest_support
        gap_pct = (current_price - best_sup_price) / current_price * 100
        
        # === Step 4: Branching & Messaging ===
        status = "WAIT"
        reason = ""
        action = ""
        entry = best_sup_price
        
        if is_uptrend:
            if gap_pct < 3:
                status = "ACTIVE"
                reason = f"{best_sup_name} 근접 - 현재가 매수 가능 (상승 추세)"
            elif gap_pct < 5:
                status = "WAIT"
                reason = f"상승 추세 - ₩{int(best_sup_price):,} ({best_sup_name}) 터치 시 매수"
            elif gap_pct < 10:
                status = "WAIT"
                reason = f"조정 대기 - ₩{int(best_sup_price):,} ({best_sup_name}) 근접 시 진입"
            elif gap_pct < 15:
                status = "WAIT"
                reason = "강한 상승 - 분할 매수 고려 (이격 과다)"
            else:
                status = "WAIT"
                reason = "큰 조정 없으면 진입 어려움 - 알림 설정 권장"
                
        elif is_downtrend:
            if gap_pct < 3:
                status = "WAIT"
                reason = f"반등 시도 - {best_sup_name} 지지 및 추세 전환 확인"
            else:
                status = "AVOID"
                # For downtrend, maybe show resistance?
                res_check = ma60 if ma60 else (ma20 if ma20 else current_price)
                reason = f"하락 추세 - 매수 보류 (60일선 회복 대기)"
                
        else: # Sideways
            if gap_pct < 5:
                status = "WAIT" # Wait for confirmation even at bottom
                reason = f"박스권 하단 - {best_sup_name} 지지 확인 후 매수"
            else:
                status = "WAIT"
                reason = "방향성 불명 - 추세 전환 대기"

            swing_highs = find_swing_highs(5)
            
            # Calculate Targets based on Resistance
            resistances = [p for p in swing_highs if p > current_price * 1.02] # At least 2% above
            resistances.sort()
            
            # Defaults
            t1 = current_price * 1.10
            t2 = current_price * 1.20
            
            if len(resistances) >= 1:
                t1 = resistances[0]
                # If next resistance is too close to T1 (within 3%), skip it
                valid_r2 = [r for r in resistances if r > t1 * 1.03]
                if valid_r2:
                    t2 = valid_r2[0]
                else:
                    t2 = t1 * 1.10 # Fallback +10% from T1

            return {
                "status": status,
                "score": 70 if status == 'ACTIVE' else 50,
                "strategy": "PULLBACK" if is_uptrend else "NO_TRADE",
                "confidenceFlags": ["UPTREND"] if is_uptrend else (["DOWNTREND"] if is_downtrend else []),
                "reason": reason,
                "entry": round(entry, -1),
                "stop": round(entry * 0.95, -1),
                "target": round(t1, -1),
                "targets": [round(t1, -1), round(t2, -1)]
            }

    # We mainly use 'short' now, but populate others to avoid errors if referenced
    res = solve('short')
    return {
        "short": res,
        "mid": res,
        "long": res,
        "is_abnormal": len(history_rows) < 120
    }

def process_watchlist(tickers):
    """
    Analyze user's interested tickers and upload reports.
    Optimized: Bulk fetch and group in memory.
    """
    if not tickers:
        return

    normalized_tickers = list(set([t.split('.')[0] for t in tickers]))
    cur = get_db_cursor()
    
    placeholders = ','.join(['?'] * len(normalized_tickers))
    
    price_sql = f"""
        SELECT code, date, close, high, low, market_cap, per, pbr, revenue, net_income
        FROM daily_price 
        WHERE code IN ({placeholders})
        ORDER BY code, date DESC
    """
    
    supply_sql = f"""
        SELECT code, date, foreigner, institution, pension
        FROM daily_supply
        WHERE code IN ({placeholders})
        ORDER BY code, date DESC
    """
    
    try:
        cur.execute(price_sql, normalized_tickers)
        price_rows = cur.fetchall()
        
        cur.execute(supply_sql, normalized_tickers)
        supply_rows = cur.fetchall()
        
        price_map = {}
        for r in price_rows:
            if r["code"] not in price_map: price_map[r["code"]] = []
            price_map[r["code"]].append(dict(r))
            
        supply_map = {}
        for r in supply_rows:
            if r["code"] not in supply_map: supply_map[r["code"]] = []
            supply_map[r["code"]].append(dict(r))
            
        # Need to fetch Stock Name for "Daily Insight" format
        cur.execute(f"SELECT code, name FROM tickers WHERE code IN ({placeholders})", normalized_tickers)
        name_map = {r["code"]: r["name"] for r in cur.fetchall()}

        reports = []
        for code in normalized_tickers:
            p_history = price_map.get(code, [])
            s_history = supply_map.get(code, [])
            
            if not p_history: continue
            
            # 1. Technical Analysis V3
            latest_price = p_history[0]["close"]
            obj_v3 = calculate_objectives_v3(latest_price, p_history)
            
            # Check §11.2: Proceed even if AVOID to ensure fundamentals/supply are visible in UI
            if obj_v3:
                all_avoid = all(obj_v3[tf]["status"] == 'AVOID' for tf in ['short', 'mid', 'long'])
                if all_avoid:
                    logger.info(f"📊 {code} is Status: AVOID (Uploading minimal report for UI visibility)")

            # 2. Supply Analysis
            c_map = {p["date"]: p["close"] for p in p_history[:200]}
            supply_chart = []
            
            f_net_5 = sum(s["foreigner"] for s in s_history[:5])
            i_net_5 = sum(s["institution"] for s in s_history[:5])
            f_net_20 = sum(s["foreigner"] for s in s_history[:20])
            i_net_20 = sum(s["institution"] for s in s_history[:20])
            
            for s in reversed(s_history[:200]):
                supply_chart.append({
                    "date": s["date"],
                    "foreigner": s["foreigner"],
                    "institution": s["institution"],
                    "pension": s.get("pension", 0),
                    "close": c_map.get(s["date"])
                })
            
            # 3. Merge & Summary
            latest_p = p_history[0]
            # Use short-term strategy for overall summary if ACTIVE, otherwise reason
            main_obj = obj_v3["short"] if obj_v3 else None
            
            raw_reason = main_obj["reason"] if main_obj else "데이터 분석 중..."
            stock_name = name_map.get(code, code)
            
            # Format Daily Insight as: "Name: Reason"
            # Previous logic tried to extract parentheses content, but V3 reasons are descriptive sentences.
            # It is better to show the full actionable insight.
            summary = f"{stock_name}: {raw_reason}"

            report = {
                "date": TODAY,
                "ticker": code,
                "report_data": {
                    "v3_objectives": obj_v3,
                    "summary": summary,
                    "trend": main_obj["status"] if main_obj else "NEUTRAL",
                    "technical_score": main_obj["score"] if main_obj else 0,
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
                        "pbr": latest_p.get("pbr"),
                        "revenue": latest_p.get("revenue"),
                        "net_income": latest_p.get("net_income")
                    }
                }
            }
            reports.append(report)

        if reports:
            supabase.table("daily_analysis_reports").upsert(reports, on_conflict="ticker").execute()
            logger.info(f"✅ Uploaded {len(reports)} V3 reports to Supabase.")
            
    except Exception as e:
        logger.error(f"Watchlist processing failed: {e}")

def run_algo_screening(target_date=None):
    """
    Filter all stocks for specific strategies (Algo Picks).
    v5 Spec: Dynamic thresholds, multi-level sorting, and group-based confluence.
    target_date: 'YYYY-MM-DD' string. If None, defaults to latest DB date.
    """
    logger.info(f"🕵️ Running Algorithm Screening (Algo Picks v5) for {target_date or 'Latest'}...")
    cur = get_db_cursor()
    
    # 0. Initial Setup & Universe Check
    if target_date:
        # DB uses YYYYMMDD format for daily_price
        db_date = target_date.replace('-', '')
        
        # Verify date exists in DB
        cur.execute("SELECT 1 FROM daily_price WHERE date = ? LIMIT 1", (db_date,))
        if not cur.fetchone():
            logger.warning(f"No price data found for {db_date} (target: {target_date}). Skipping.")
            return []
        max_price_date = db_date
        max_supply_date = db_date
    else:
        cur.execute("SELECT MAX(date) FROM daily_price")
        max_price_date = cur.fetchone()[0]
        cur.execute("SELECT MAX(date) FROM daily_supply")
        max_supply_date = cur.fetchone()[0]

    if not max_price_date:
        logger.warning("No data found in DB. Skipping Algo Screening.")
        return []

    # Calculate Dynamic Mcap Threshold (Top 70% of Active Universe)
    cur.execute("""
        SELECT market_cap FROM daily_price p
        JOIN tickers t ON p.code = t.code
        WHERE p.date = ? AND t.is_active = 1 AND p.market_cap > 0
    """, (max_price_date,))
    mcap_universe = [r[0] for r in cur.fetchall()]
    u_size = len(mcap_universe)
    
    if u_size > 0:
        mcap_universe.sort()
        # Top 70% means the 30th percentile from the bottom
        idx = int(u_size * 0.3)
        mcap_threshold_dynamic = mcap_universe[idx]
    else:
        mcap_threshold_dynamic = 300000000000 # Fallback 300B
    
    GLOBAL_MCAP_MIN = max(300000000000, mcap_threshold_dynamic)
    logger.info(f"📊 Mcap Universe: {u_size} stocks. Threshold: {GLOBAL_MCAP_MIN/1e8:.1f}B Won (Top 70% vs 300B)")

    def get_tech_status(ticker_code):
        """Fetch history and calculate V3 status for screening safety."""
        cur.execute("""
            SELECT close, high, low, date 
            FROM daily_price 
            WHERE code = ? AND date <= ?
            ORDER BY date DESC LIMIT 150
        """, (ticker_code, max_price_date))
        rows = cur.fetchall()
        if len(rows) < 120: return "UNKNOWN"
        
        hist = [dict(r) for r in rows]
        res = calculate_objectives_v3(hist[0]["close"], hist)
        if not res: return "UNKNOWN"
        
        # If any timeframe is NOT AVOID, we consider it OK/WAIT
        # But for strict momentum, we'll check 'mid'
        status = res['mid']['status']
        return status

    strategies_raw = {} # {strategy_id: [candidates]}
    filter_counts = {s_id: {"Mcap": 0, "NetIncome": 0, "Technical": 0, "Other": 0} for s_id in STRATEGY_META}

    def get_mcap_limit(s_id):
        override = STRATEGY_META[s_id].get("mcap_override")
        return override if override is not None else GLOBAL_MCAP_MIN

    # Strategy 1: Value Picks
    # Priority: Profit Quality DESC -> PER ASC -> PBR ASC
    mcap_limit_val = get_mcap_limit("Value_Picks")
    cur.execute("""
        SELECT p.code, p.per, p.pbr, p.roe, p.operating_margin, p.market_cap, p.eps, p.close
        FROM daily_price p
        JOIN tickers t ON p.code = t.code
        WHERE p.date = ? AND t.is_active = 1
    """, (max_price_date,))
    
    val_candidates = []
    for r in cur.fetchall():
        d = dict(r)
        code = d['code']
        mcap = d['market_cap'] or 0
        # Filters
        if mcap < mcap_limit_val:
            if code in DEBUG_TICKERS: logger.debug(f"[Value_Picks][{code}] Drop: Mcap {mcap} < {mcap_limit_val}")
            filter_counts["Value_Picks"]["Mcap"] += 1
            continue
        if (d['eps'] or 0) <= 0: # NetIncome Check
            if code in DEBUG_TICKERS: logger.debug(f"[Value_Picks][{code}] Drop: NetIncome <= 0")
            filter_counts["Value_Picks"]["NetIncome"] += 1
            continue
        if not (0 < d['per'] < 30 and 0.3 <= d['pbr'] < 1.2 and (d['roe'] or 0) >= 8):
            if code in DEBUG_TICKERS: logger.debug(f"[Value_Picks][{code}] Drop: PER/PBR/ROE range fail")
            filter_counts["Value_Picks"]["Other"] += 1
            continue
        
        # Scoring
        profit_quality = (d['roe'] or 0) * 0.6 + (d['operating_margin'] or 0) * 0.4
        
        # Technical Status for Value Picks (Warning only, no exclusion)
        t_status = get_tech_status(code)
        
        val_candidates.append({
            "ticker": code,
            "sort_key": (-profit_quality, d['per'], d['pbr']),
            "metrics": {"profit_quality": profit_quality, "per": d['per'], "pbr": d['pbr']},
            "price": d['close'],
            "technical_status": t_status
        })
    val_candidates.sort(key=lambda x: x["sort_key"])
    strategies_raw["Value_Picks"] = val_candidates[:15]

    # Strategy 2: Twin Engines
    # Priority: Demand Power DESC -> Co-momentum DESC -> Total Buy DESC
    mcap_limit_twin = get_mcap_limit("Twin_Engines")
    cur.execute("""
        SELECT s.code, s.foreigner, s.institution, p.market_cap, p.close
        FROM daily_supply s
        JOIN daily_price p ON s.code = p.code AND s.date = p.date
        JOIN tickers t ON s.code = t.code
        WHERE s.date = ? AND t.is_active = 1
        AND s.foreigner > 0 AND s.institution > 0
    """, (max_supply_date,))
    
    twin_candidates = []
    for r in cur.fetchall():
        d = dict(r)
        code = d['code']
        mcap = d['market_cap'] or 1
        f_buy, i_buy = d['foreigner'], d['institution']
        
        if mcap < mcap_limit_twin:
            if code in DEBUG_TICKERS: logger.debug(f"[Twin_Engines][{code}] Drop: Mcap {mcap} < {mcap_limit_twin}")
            filter_counts["Twin_Engines"]["Mcap"] += 1
            continue
            
        demand_power = ((f_buy + i_buy) / mcap) * 100
        if demand_power < 0.05:
            if code in DEBUG_TICKERS: logger.debug(f"[Twin_Engines][{code}] Drop: Demand Power {demand_power:.3f}% < 0.05%")
            filter_counts["Twin_Engines"]["Other"] += 1
            continue
            
        co_momentum = min(f_buy, i_buy)
        
        # 2. Technical Safety Filter (Strict Exclusion for Momentum)
        t_status = get_tech_status(code)
        if t_status == "AVOID":
            if code in DEBUG_TICKERS: logger.debug(f"[Twin_Engines][{code}] Drop: Technical Status AVOID")
            filter_counts["Twin_Engines"]["Technical"] += 1
            continue

        twin_candidates.append({
            "ticker": code,
            "sort_key": (-demand_power, -co_momentum, -(f_buy + i_buy)),
            "metrics": {"demand_power": demand_power, "co_momentum": co_momentum},
            "price": d['close'],
            "technical_status": t_status
        })
    twin_candidates.sort(key=lambda x: x["sort_key"])
    strategies_raw["Twin_Engines"] = twin_candidates[:15]

    # Strategy 3: Foreigner Accumulation
    # Priority: Accumulation Density DESC -> 21d Acc DESC -> Box Range ASC
    mcap_limit_acc = get_mcap_limit("Foreigner_Accumulation")
    # Simplify query: Fetch 21d sum for all active tickers
    cur.execute("""
        SELECT code, SUM(foreigner) as f_sum 
        FROM daily_supply 
        WHERE date >= strftime('%Y%m%d', 'now', '-21 days')
        GROUP BY code HAVING f_sum > 0
    """)
    acc_stats = {r[0]: r[1] for r in cur.fetchall()}
    
    acc_candidates = []
    for code, f_sum in acc_stats.items():
        cur.execute("""
            SELECT close, MAX(close) as h, MIN(close) as l, market_cap 
            FROM daily_price WHERE code = ? AND date >= strftime('%Y%m%d', 'now', '-21 days')
        """, (code,))
        p = cur.fetchone()
        if not p: continue
        mcap = p['market_cap'] or 0
        if not mcap: continue
        
        if mcap < mcap_limit_acc:
            if code in DEBUG_TICKERS: logger.debug(f"[Foreigner_Acc][{code}] Drop: Mcap {mcap} < {mcap_limit_acc}")
            filter_counts["Foreigner_Accumulation"]["Mcap"] += 1
            continue
            
        box_range = (p['h'] - p['l']) / p['l'] if p['l'] > 0 else 1.0
        if box_range > 0.12:
            if code in DEBUG_TICKERS: logger.debug(f"[Foreigner_Acc][{code}] Drop: Box Range {box_range:.2%} > 12%")
            filter_counts["Foreigner_Accumulation"]["Other"] += 1
            continue
            
        density = (f_sum / p['market_cap']) * 100
        
        # 2. Technical Safety Filter (Strict Exclusion for Momentum)
        t_status = get_tech_status(code)
        if t_status == "AVOID":
            if code in DEBUG_TICKERS: logger.debug(f"[Foreigner_Acc][{code}] Drop: Technical Status AVOID")
            filter_counts["Foreigner_Accumulation"]["Technical"] += 1
            continue

        acc_candidates.append({
            "ticker": code,
            "sort_key": (-density, -f_sum, box_range),
            "metrics": {"acc_density": density, "acc_21d": f_sum, "box_range": box_range},
            "price": p['close'],
            "technical_status": t_status
        })
    acc_candidates.sort(key=lambda x: x["sort_key"])
    strategies_raw["Foreigner_Accumulation"] = acc_candidates[:15]

    # Strategy 4: Trend Following
    # Priority: Vol Power DESC -> Trend Score DESC -> Breakout Age ASC
    mcap_limit_trend = get_mcap_limit("Trend_Following")
    # Fetch 120 days of history for each active ticker to check MAs properly
    # Using a simplified approach: fetch candidates that meet volume/price first, then verify history
    cur.execute("""
        SELECT p.code, p.close, p.open, p.high, p.volume, p.market_cap
        FROM daily_price p JOIN tickers t ON p.code = t.code
        WHERE p.date = ? AND t.is_active = 1 AND p.close > p.open
    """, (max_price_date,))
    
    trend_candidates = []
    
    # Pre-fetch volume history is too slow for all, so we iterate
    # But we can batch fetch for better perf if needed. For now, per-ticker query is OK for small subsets.
    
    potential_raw = cur.fetchall()
    
    for r in potential_raw:
        d = dict(r)
        code = d['code']
        mcap = d['market_cap'] or 0
        if mcap < mcap_limit_trend:
            filter_counts["Trend_Following"]["Mcap"] += 1
            continue
            
        # Wick Check: Rejection (Upper wick vs Body)
        # We want strong close: upper_wick shouldn't be too large compared to total range
        body = d['close'] - d['open']
        total_range = d['high'] - d['open'] # Approximation
        upper_wick = d['high'] - d['close']
        
        # Condition 1: Strong Finish (Upper wick < 2 * Body) => Body holds majority
        # Also prevent extremely small body doji if high volatility
        if body == 0: 
            filter_counts["Trend_Following"]["Other"] += 1
            continue
            
        if upper_wick > 2.0 * body:
            if code in DEBUG_TICKERS: logger.debug(f"[Trend_Following][{code}] Drop: Wick too long")
            filter_counts["Trend_Following"]["Other"] += 1
            continue
            
        # Vol Power & Volume MA
        cur.execute("SELECT volume FROM daily_price WHERE code = ? AND date < ? ORDER BY date DESC LIMIT 20", (code, max_price_date))
        v_hist = [h[0] for h in cur.fetchall()]
        if len(v_hist) < 20: 
            continue
        avg_v20 = sum(v_hist) / 20
        vol_power = min(5.0, d['volume'] / avg_v20) if avg_v20 > 0 else 0
        
        # Condition 2: Volume Explosion
        if vol_power < 1.5: 
            if code in DEBUG_TICKERS: logger.debug(f"[Trend_Following][{code}] Drop: Vol Power {vol_power:.2f} < 1.5")
            continue
            
        # Condition 3: MA Arrangement (MA5 > MA20 > MA60) or at least MA5 > MA20 and Price > MA60
        cur.execute("SELECT close FROM daily_price WHERE code = ? AND date <= ? ORDER BY date DESC LIMIT 60", (code, max_price_date))
        h_closes = [h[0] for h in cur.fetchall()]
        
        if len(h_closes) < 60:
            if code in DEBUG_TICKERS: logger.debug(f"[Trend_Following][{code}] Drop: Insufficient history for MA")
            continue
            
        ma5 = sum(h_closes[:5]) / 5
        ma20 = sum(h_closes[:20]) / 20
        ma60 = sum(h_closes[:60]) / 60
        
        # Check: Price > MA20 (Trend) AND MA5 > MA20 (Short term momentum)
        if not (d['close'] > ma20 and ma5 > ma20):
            if code in DEBUG_TICKERS: logger.debug(f"[Trend_Following][{code}] Drop: Broken Trend (P<{d['close']} vs {ma20:.0f} or MA5<MA20)")
            filter_counts["Trend_Following"]["Technical"] += 1
            continue

        # 4. Technical Safety Filter (Strict)
        t_status = get_tech_status(code)
        if t_status == "AVOID":
            filter_counts["Trend_Following"]["Technical"] += 1
            continue
        
        # Scoring: Bonus for perfect alignment (MA20 > MA60)
        trend_score = 30 if ma20 > ma60 else 15
        
        trend_candidates.append({
            "ticker": code,
            "sort_key": (-vol_power, -trend_score),
            "metrics": {
                "vol_power": vol_power, 
                "trend_score": trend_score,
                "ma_align": "MA5>20>60" if ma20 > ma60 else "MA5>20"
            },
            "price": d['close'],
            "technical_status": t_status
        })
    trend_candidates.sort(key=lambda x: x["sort_key"])
    strategies_raw["Trend_Following"] = trend_candidates[:15]

    # --- 🕵️ Confluence & Final Ranking ---
    # Log Filter Summaries
    for s_id, counts in filter_counts.items():
        logger.info(f"  [{s_id}] Filtered: Mcap={counts['Mcap']}, NetIncome={counts['NetIncome']}, Technical={counts['Technical']}, Other={counts['Other']}")

    all_found_tickers = {} # {ticker: {rank_sum, count, groups, best_rank}}
    for s_id, candidates in strategies_raw.items():
        if not candidates:
            logger.info(f"  [{s_id}] NO_QUALIFIED_CANDIDATES")
            continue
            
        for rank, cand in enumerate(candidates, 1):
            ticker = cand["ticker"]
            if ticker not in all_found_tickers:
                all_found_tickers[ticker] = {"rank_sum": 0, "count": 0, "groups": set(), "best_rank": 999}
            
            stats = all_found_tickers[ticker]
            stats["rank_sum"] += rank
            stats["count"] += 1
            stats["groups"].add(STRATEGY_META[s_id]["group"])
            stats["best_rank"] = min(stats["best_rank"], rank)

    # Calculate Weighted Confluence
    confluence_list = []
    for ticker, stats in all_found_tickers.items():
        weighted_group_score = sum(GROUP_WEIGHT.get(g, 1.0) for g in stats["groups"])
        avg_rank = stats["rank_sum"] / stats["count"]
        confluence_list.append({
            "ticker": ticker,
            "weighted_group_score": weighted_group_score,
            "best_rank": stats["best_rank"],
            "avg_rank": avg_rank,
            "groups": list(stats["groups"]),
            "groups": list(stats["groups"]),
            "price": get_tech_status(ticker) == "UNKNOWN" and 0 or 0, # Placeholder, Confluence pricing is complex, skip for now or fetch
            "technical_status": get_tech_status(ticker) # Fetch status for confluence items
        })

    # Sort Confluence: Group Score DESC -> Best Rank ASC -> Avg Rank ASC
    confluence_list.sort(key=lambda x: (-x["weighted_group_score"], x["best_rank"], x["avg_rank"]))
    final_confluence = confluence_list[:5]

    # --- 📦 Payload Construction & Sync ---
    picks_payload = []
    # 1. Strategy Picks (Top 5 each)
    for s_id, candidates in strategies_raw.items():
        status = "OK" if candidates else "NO_QUALIFIED_CANDIDATES"
        tickers = [c["ticker"] for c in candidates[:5]]
        
        details = {
            "status": status,
            "meta_version": "v5.0",
            "analyzer_ver": "1.0",
            "snapshots": {
                "mcap_threshold": GLOBAL_MCAP_MIN,
                "universe_size": u_size,
                "group_weights": GROUP_WEIGHT
            },
            "candidates": {
                c["ticker"]: {
                    "rank": i+1,
                    "metrics": c["metrics"],
                    "price": c.get("price", 0),
                    "technical_status": c.get("technical_status", "UNKNOWN")
                } for i, c in enumerate(candidates[:5])
            }
        }
        picks_payload.append({
            "date": target_date or TODAY,
            "strategy_name": s_id,
            "tickers": tickers,
            "details": details
        })

    # 2. Confluence Pick (Unified Strategy)
    confluence_tickers = [c["ticker"] for c in final_confluence]
    picks_payload.append({
        "date": target_date or TODAY,
        "strategy_name": "Confluence_Top",
        "tickers": confluence_tickers,
        "details": {
            "status": "OK" if confluence_tickers else "NONE",
            "meta_version": "v5.0",
            "items": [
                {
                    "ticker": c["ticker"],
                    "weighted_group_score": c["weighted_group_score"],
                    "best_rank": c["best_rank"],
                    "avg_rank": c["avg_rank"],
                    "groups": c["groups"],
                    "technical_status": c.get("technical_status", "UNKNOWN")
                } for c in final_confluence
            ]
        }
    })

    try:
        # Upsert with composite key (strategy_name + date)
        # Note: Supabase-py might need explicit constraint name if columns are ambiguous, 
        # but usually passing columns compliant with a unique index works.
        supabase.table("algo_picks").upsert(picks_payload, on_conflict="strategy_name, date").execute()
        logger.info(f"✅ Uploaded {len(picks_payload)} Algo Picks to Supabase (v5) for {target_date or 'Latest'}")
        
        # Send Notification (Only if processing TODAY)
        if not target_date or target_date == TODAY:
            notify_telegram(picks_payload)
    except Exception as e:
        logger.error(f"Algo Upload Error: {e}")
    
    return list(set([t for p in picks_payload for t in p["tickers"]]))

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

def notify_telegram(picks_payload):
    """
    Send a summary message to Telegram based on v5 picks payload.
    """
    db_chat_id, db_token = get_telegram_settings_from_db()
    token = db_token or os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = db_chat_id or os.getenv("TELEGRAM_CHAT_ID")
    
    if not token or not chat_id:
        logger.warning("Telegram credentials missing. Skipping notification.")
        return

    # Extract counts and top picks
    summary_map = {p["strategy_name"]: len(p["tickers"]) for p in picks_payload}
    confluence_payload = next((p for p in picks_payload if p["strategy_name"] == "Confluence_Top"), None)
    confluence_tickers = confluence_payload["tickers"] if confluence_payload else []
    
    # Link to production URL if possible, otherwise localhost
    site_url = os.getenv("NEXT_PUBLIC_SITE_URL", "https://daily-port.vercel.app")
    
    ticker_list_str = ', '.join(confluence_tickers[:5]) if confluence_tickers else 'None'
    message = f"""
🚀 *DailyPort 알고리즘 분석 완료* ({TODAY})

🔍 *전략별 매칭 현황*:
• 💎 저평가(Value): {summary_map.get('Value_Picks', 0)}개
• 🐯 동반매수(Twin): {summary_map.get('Twin_Engines', 0)}개
• 🥪 외인매집(Acc): {summary_map.get('Foreigner_Accumulation', 0)}개
• 📈 추세추종(Trend): {summary_map.get('Trend_Following', 0)}개

🏆 *통합 추천 (Confluence)*:
`{ticker_list_str}`

[알고리즘 픽 확인하기]({site_url}/algo-picks)
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
