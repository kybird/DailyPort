
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
        "tags": ["추세추종", "돌파"],
        "description": "추세추종: 거래폭발(1.5x↑) 돌파 종목 (RSI 과열 및 윗꼬리 저항 필터링)",
        "mcap_override": None,
        "version": "v5.0"
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

    ma5, ma10, ma20, ma60, ma120 = sma(5), sma(10), sma(20), sma(60), sma(120)
    current_atr = atr(14)
    current_rsi = rsi(14)
    recent_high = max(highs[:min(len(highs), 60)])
    swing_lows = find_swing_lows(5)

    def solve(timeframe):
        # 1. Base Score
        trend_score = 0
        if ma20 and ma60:
            if ma20 > ma60: trend_score = 20
            else: trend_score = -20
            # Bonus for long-term alignment
            if ma120 and ma60 > ma120: trend_score += 10
        
        momentum_score = 0
        if 50 <= current_rsi <= 65: momentum_score = 15
        elif current_rsi > 70: momentum_score = -10
        elif current_rsi < 35: momentum_score = -5

        vol_ratio = (current_atr / current_price) * 100 if current_atr and current_price else 0
        vol_adj = 5 if vol_ratio < 3 else (-15 if vol_ratio > 8 else 0)
        base_score = 50 + trend_score + momentum_score + vol_adj

        # 2. RR Configurations
        cfgs = {
            'short': {'mul': 1.5, 'min_rr': 2.0, 'max_risk': 0.05, 'prox': 0.02},
            'mid':   {'mul': 2.0, 'min_rr': 2.5, 'max_risk': 0.10, 'prox': 0.04},
            'long':  {'mul': 3.0, 'min_rr': 3.0, 'max_risk': 0.15, 'prox': 0.06}
        }
        c = cfgs[timeframe]

        # 3. Candidates
        # Filter out None values for short history stocks
        valid_mas = [m for m in [ma5, ma10, ma20, ma60, ma120] if m is not None]
        raw = valid_mas + (swing_lows[-5:] if swing_lows else [])
        candidates = sorted(list(set([p for p in raw if p and p <= current_price * 1.02])), reverse=True)

        best = None
        for entry in candidates:
            # Safe checking for swing lows
            nearby_sw = sorted([sl for sl in swing_lows if sl < entry], reverse=True)
            n_sw = nearby_sw[0] if nearby_sw else None
            
            stop = entry - (current_atr * c['mul']) if current_atr else entry * 0.95
            if n_sw and n_sw > stop * 0.95: stop = n_sw
            
            risk = entry - stop
            if risk <= 0: continue
            
            pot_target = entry + (risk * c['min_rr'])
            target = min(pot_target, recent_high if recent_high > entry else pot_target)
            
            if recent_high > entry and (recent_high - entry) < risk * 1.5:
                target = recent_high
                
            rr = (target - entry) / risk
            if rr >= c['min_rr'] and (risk/entry) <= c['max_risk']:
                best = {"entry": entry, "stop": stop, "target": target, "rr": rr}
                break

        # 4. Status & Reason
        status, strategy, reason = 'AVOID', 'NO_TRADE', "적정 진입가가 없습니다."
        flags = []
        
        # Safe flag checks
        if ma20 and ma60 and ma20 > ma60:
             if ma120 and ma60 > ma120: flags.append('UPTREND_CONFIRMED')
             else: flags.append('UPTREND_WEAK') # Partial uptrend
             
        if ma20 and ma60 and ma20 < ma60: flags.append('BROKEN_TREND')
        if vol_ratio > 10: flags.append('HIGH_VOLATILITY')
        if current_rsi > 70: flags.append('OVERBOUGHT')
        if current_rsi < 30: flags.append('OVERSOLD')

        if best:
            prox_val = (current_price - best['entry']) / best['entry']
            if prox_val <= c['prox']:
                status = 'ACTIVE' if base_score >= 60 else 'WAIT' # Slightly lower threshold for partial data
                reason = f"주요 지지선 근처 진입 가능 (손익비: {best.get('rr', 0):.1f})." if status == 'ACTIVE' else "지지선 근처이나 추세 확인 필요."
            else:
                reason = f"보수적 진입 대기 (목표가: {round(best['entry'], -1):,})."
        else:
            reason = "손익비 부적합 (저항 인접 또는 리스크 과다)."

        if status != 'AVOID':
            if 'UPTREND_CONFIRMED' in flags: strategy = 'PULLBACK_TREND'
            elif 'OVERSOLD' in flags: strategy = 'MEAN_REVERSION'

        return {
            "status": status,
            "score": int(max(0, min(100, base_score))),
            "strategy": strategy,
            "confidenceFlags": flags,
            "reason": reason,
            "entry": round(best['entry'], -1) if best and status != 'AVOID' else None,
            "stop": round(best['stop'], -1) if best and status != 'AVOID' else None,
            "target": round(best['target'], -1) if best and status != 'AVOID' else None
        }

    return {
        "short": solve('short'),
        "mid": solve('mid'),
        "long": solve('long'),
        "is_abnormal": len(history_rows) < 120 # Flag as abnormal if history is short
    }

    return {
        "short": solve('short'),
        "mid": solve('mid'),
        "long": solve('long')
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
                    "close": c_map.get(s["date"])
                })
            
            # 3. Merge & Summary
            latest_p = p_history[0]
            # Use mid-term strategy for overall summary if ACTIVE, otherwise reason
            main_obj = obj_v3["mid"] if obj_v3 else None
            summary = main_obj["reason"] if main_obj else "데이터 분석 중..."

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

def run_algo_screening():
    """
    Filter all stocks for specific strategies (Algo Picks).
    v5 Spec: Dynamic thresholds, multi-level sorting, and group-based confluence.
    """
    logger.info("🕵️ Running Algorithm Screening (Algo Picks v5)...")
    cur = get_db_cursor()
    
    # 0. Initial Setup & Universe Check
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
            WHERE code = ? 
            ORDER BY date DESC LIMIT 150
        """, (ticker_code,))
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
        SELECT p.code, p.per, p.pbr, p.roe, p.operating_margin, p.market_cap, p.eps
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
            SELECT MAX(close) as h, MIN(close) as l, market_cap 
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
            "technical_status": t_status
        })
    acc_candidates.sort(key=lambda x: x["sort_key"])
    strategies_raw["Foreigner_Accumulation"] = acc_candidates[:15]

    # Strategy 4: Trend Following
    # Priority: Vol Power DESC -> Trend Score DESC -> Breakout Age ASC
    mcap_limit_trend = get_mcap_limit("Trend_Following")
    cur.execute("""
        SELECT p.code, p.close, p.open, p.high, p.volume, p.market_cap
        FROM daily_price p JOIN tickers t ON p.code = t.code
        WHERE p.date = ? AND t.is_active = 1 AND p.close > p.open
    """, (max_price_date,))
    
    trend_candidates = []
    for r in cur.fetchall():
        d = dict(r)
        code = d['code']
        mcap = d['market_cap'] or 0
        if mcap < mcap_limit_trend:
            if code in DEBUG_TICKERS: logger.debug(f"[Trend_Following][{code}] Drop: Mcap {mcap} < {mcap_limit_trend}")
            filter_counts["Trend_Following"]["Mcap"] += 1
            continue
            
        # Wick Check
        body = d['close'] - d['open']
        upper_wick = d['high'] - d['close']
        if upper_wick >= body:
            if code in DEBUG_TICKERS: logger.debug(f"[Trend_Following][{code}] Drop: Wick {upper_wick} >= Body {body}")
            filter_counts["Trend_Following"]["Other"] += 1
            continue
            
        # Vol Power
        cur.execute("SELECT volume FROM daily_price WHERE code = ? AND date < ? ORDER BY date DESC LIMIT 20", (code, max_price_date))
        v_hist = [h[0] for h in cur.fetchall()]
        if len(v_hist) < 20: 
            if code in DEBUG_TICKERS: logger.debug(f"[Trend_Following][{code}] Drop: Insufficient volume history")
            continue
        avg_v20 = sum(v_hist) / 20
        vol_power = min(5.0, d['volume'] / avg_v20) if avg_v20 > 0 else 0
        if vol_power < 1.5: 
            if code in DEBUG_TICKERS: logger.debug(f"[Trend_Following][{code}] Drop: Vol Power {vol_power:.2f} < 1.5")
            continue
            
        # 2. Technical Safety Filter (Strict Exclusion for Momentum)
        t_status = get_tech_status(code)
        if t_status == "AVOID":
            if code in DEBUG_TICKERS: logger.debug(f"[Trend_Following][{code}] Drop: Technical Status AVOID")
            filter_counts["Trend_Following"]["Technical"] += 1
            continue
        
        # Trend Score & Breakout Age
        cur.execute("SELECT close, high FROM daily_price WHERE code = ? ORDER BY date DESC LIMIT 120", (code,))
        h_data = cur.fetchall()
        h_closes = [h[0] for h in h_data]
        h_highs = [h[1] for h in h_data]
        
        ma20, ma60, ma120 = sum(h_closes[:20])/20, sum(h_closes[:60])/60, sum(h_closes[:120])/120
        trend_score = 30 if ma20 > ma60 > ma120 else (20 if ma20 > ma60 else 0)
        
        # Breakout Age (Simplified: days since 20d high)
        max_h20 = max(h_highs[1:21])
        breakout_age = 0 if d['high'] > max_h20 else 99 # Simplified for now
        
        trend_candidates.append({
            "ticker": code,
            "sort_key": (-vol_power, -trend_score, breakout_age),
            "metrics": {"vol_power": vol_power, "trend_score": trend_score},
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
                    "technical_status": c.get("technical_status", "UNKNOWN")
                } for i, c in enumerate(candidates[:5])
            }
        }
        picks_payload.append({
            "date": TODAY,
            "strategy_name": s_id,
            "tickers": tickers,
            "details": details
        })

    # 2. Confluence Pick (Unified Strategy)
    confluence_tickers = [c["ticker"] for c in final_confluence]
    picks_payload.append({
        "date": TODAY,
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
        supabase.table("algo_picks").upsert(picks_payload, on_conflict="strategy_name").execute()
        logger.info(f"✅ Uploaded {len(picks_payload)} Algo Picks to Supabase (v5)")
        
        # Send Notification
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
