"""
네이버 금융 데이터 크롤러
- 실시간 시세 (현재가, 등락률)
- 주요 지표 (PER, PBR, EPS)
- 시가총액
- ETF 괴리율

Features:
- 1분 TTL 캐싱으로 중복 요청 방지
- Rate limiting (0.3초 간격)
"""
import requests
from bs4 import BeautifulSoup
from typing import Optional, Dict, Any
from datetime import datetime
import time
import re

# === 캐싱 설정 ===
CACHE_TTL_SECONDS = 60  # 1분 TTL
_request_cache: Dict[str, Dict] = {}


def _is_cache_valid(ticker: str) -> bool:
    """캐시가 유효한지 확인 (1분 이내)"""
    cache = _request_cache.get(ticker)
    if not cache:
        return False
    
    cached_time = datetime.fromisoformat(cache['fetchedAt'])
    elapsed = (datetime.now() - cached_time).total_seconds()
    return elapsed < CACHE_TTL_SECONDS


def _get_cache(ticker: str) -> Optional[Dict]:
    """캐시에서 데이터 가져오기"""
    return _request_cache.get(ticker)


def _set_cache(ticker: str, data: Dict) -> None:
    """캐시에 데이터 저장"""
    _request_cache[ticker] = data


def _parse_number(text: str) -> int:
    """숫자 파싱 (쉼표, 공백 제거)"""
    if not text:
        return 0
    # 숫자만 추출
    numbers = re.sub(r'[^\d]', '', text)
    return int(numbers) if numbers else 0


def _parse_float(text: str) -> Optional[float]:
    """소수점 숫자 파싱"""
    if not text or text.strip() in ('N/A', '-', ''):
        return None
    try:
        # 쉼표 제거 후 float 변환
        cleaned = text.replace(',', '').strip()
        return float(cleaned)
    except ValueError:
        return None


def get_stock_quote(ticker: str, force_refresh: bool = False) -> Optional[Dict[str, Any]]:
    """
    네이버 금융에서 주식 시세 조회
    
    Args:
        ticker: 종목코드 (예: "005930")
        force_refresh: True면 캐시 무시하고 새로 가져옴
    
    Returns:
        시세 데이터 딕셔너리 또는 None
    """
    # 캐시 확인 (1분 이내 요청은 캐시 사용)
    if not force_refresh and _is_cache_valid(ticker):
        print(f"[CACHE HIT] {ticker} - 캐시 데이터 사용 (1분 이내)")
        return _get_cache(ticker)
    
    url = f"https://finance.naver.com/item/main.naver?code={ticker}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"[ERROR] {ticker}: HTTP {response.status_code}")
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 종목명
        name_elem = soup.select_one('.wrap_company h2 a')
        name = name_elem.text.strip() if name_elem else ticker
        
        # 현재가
        current_price_elem = soup.select_one('.no_today .blind')
        current_price = _parse_number(current_price_elem.text) if current_price_elem else 0
        
        # 등락가 및 등락률
        change_elem = soup.select_one('.no_exday')
        change_price = 0
        change_percent = 0.0
        
        if change_elem:
            # 상승/하락 방향 판단
            is_down = 'nv_down' in str(change_elem) or 'ico_down' in str(change_elem)
            
            # 등락가 파싱
            change_spans = change_elem.select('span.blind')
            if len(change_spans) >= 1:
                change_price = _parse_number(change_spans[0].text)
                if is_down:
                    change_price = -change_price
            
            # 등락률 파싱
            if len(change_spans) >= 2:
                pct_text = change_spans[1].text.replace('%', '').strip()
                change_percent = _parse_float(pct_text) or 0.0
                if is_down:
                    change_percent = -change_percent
        
        # PER, PBR (투자정보 테이블에서)
        per = None
        pbr = None
        
        # 투자정보 테이블 찾기
        per_elem = soup.select_one('#_per')
        pbr_elem = soup.select_one('#_pbr')
        
        if per_elem:
            per = _parse_float(per_elem.text)
        if pbr_elem:
            pbr = _parse_float(pbr_elem.text)
        
        # 시가총액 (억원 단위)
        market_cap = None
        market_sum_elem = soup.select_one('#_market_sum')
        if market_sum_elem:
            # "1,234" 형태 → 1234억원 → 원 단위로 변환
            market_cap_억 = _parse_number(market_sum_elem.text)
            market_cap = market_cap_억 * 100000000  # 억원 → 원
        
        # 52주 최고/최저
        high_52week = None
        low_52week = None
        week52_elem = soup.select('.tab_con1 table tr')
        for tr in week52_elem:
            th = tr.select_one('th')
            td = tr.select_one('td')
            if th and td:
                if '52주' in th.text and '최고' in th.text:
                    high_52week = _parse_number(td.text)
                elif '52주' in th.text and '최저' in th.text:
                    low_52week = _parse_number(td.text)
        
        # EPS, BPS
        eps = None
        bps = None
        # 투자지표 테이블에서 EPS, BPS 파싱
        invest_table = soup.select('.aside_invest_info table tr')
        for tr in invest_table:
            th = tr.select_one('th, em')
            td = tr.select_one('td')
            if th and td:
                if 'EPS' in th.text:
                    eps = _parse_float(td.text)
                elif 'BPS' in th.text:
                    bps = _parse_float(td.text)
        
        data = {
            "ticker": ticker,
            "name": name,
            "currentPrice": current_price,
            "changePrice": change_price,
            "changePercent": change_percent,
            "per": per,
            "pbr": pbr,
            "eps": eps,
            "marketCap": market_cap,
            "high52Week": high_52week,
            "low52Week": low_52week,
            "currency": "KRW",
            "source": "NAVER",
            "fetchedAt": datetime.now().isoformat()
        }
        
        # 캐시에 저장
        _set_cache(ticker, data)
        print(f"[FETCH] {ticker} ({name}) - 네이버 금융에서 가져옴: {current_price:,}원")
        
        # Rate limiting: 연속 요청 시 0.3초 대기
        time.sleep(0.3)
        
        return data
        
    except requests.exceptions.Timeout:
        print(f"[TIMEOUT] {ticker}: 요청 시간 초과")
        return None
    except Exception as e:
        print(f"[ERROR] {ticker}: {e}")
        return None


def get_etf_quote(ticker: str, force_refresh: bool = False) -> Optional[Dict[str, Any]]:
    """
    네이버 금융에서 ETF 시세 및 괴리율 조회
    
    Args:
        ticker: ETF 종목코드 (예: "069500" KODEX 200)
        force_refresh: True면 캐시 무시
    
    Returns:
        ETF 시세 데이터 (괴리율 포함)
    """
    # 캐시 확인
    if not force_refresh and _is_cache_valid(ticker):
        print(f"[CACHE HIT] ETF {ticker}")
        return _get_cache(ticker)
    
    # ETF 전용 페이지
    url = f"https://finance.naver.com/item/main.naver?code={ticker}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 기본 정보 (주식과 동일하게 파싱)
        name_elem = soup.select_one('.wrap_company h2 a')
        name = name_elem.text.strip() if name_elem else ticker
        
        current_price_elem = soup.select_one('.no_today .blind')
        current_price = _parse_number(current_price_elem.text) if current_price_elem else 0
        
        # NAV (순자산가치) - ETF 상세 정보에서 파싱
        nav = None
        premium_discount = None
        
        # ETF 상세 테이블에서 NAV, 괴리율 찾기
        etf_info = soup.select('.tab_con1 table tr')
        for tr in etf_info:
            th = tr.select_one('th')
            td = tr.select_one('td')
            if th and td:
                th_text = th.text.strip()
                if 'NAV' in th_text or '순자산' in th_text:
                    nav = _parse_number(td.text)
                elif '괴리율' in th_text or '괴리' in th_text:
                    premium_discount = _parse_float(td.text.replace('%', ''))
        
        # NAV가 있고 괴리율이 없으면 직접 계산
        if nav and nav > 0 and premium_discount is None and current_price > 0:
            premium_discount = ((current_price - nav) / nav) * 100
        
        data = {
            "ticker": ticker,
            "name": name,
            "currentPrice": current_price,
            "nav": nav,
            "premiumDiscount": round(premium_discount, 2) if premium_discount else None,
            "assetType": "ETF",
            "source": "NAVER_ETF",
            "fetchedAt": datetime.now().isoformat()
        }
        
        _set_cache(ticker, data)
        print(f"[FETCH] ETF {ticker} ({name}) - 현재가: {current_price:,}, NAV: {nav}, 괴리율: {premium_discount}%")
        
        time.sleep(0.3)
        return data
        
    except Exception as e:
        print(f"[ERROR] ETF {ticker}: {e}")
        return None


def get_multiple_quotes(tickers: list, force_refresh: bool = False) -> Dict[str, Dict]:
    """
    여러 종목 시세 일괄 조회
    
    Args:
        tickers: 종목코드 리스트
        force_refresh: 캐시 무시 여부
    
    Returns:
        {ticker: quote_data} 딕셔너리
    """
    results = {}
    for ticker in tickers:
        quote = get_stock_quote(ticker, force_refresh)
        if quote:
            results[ticker] = quote
    return results


# === CLI 테스트 ===
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python naver_finance.py <ticker> [--etf]")
        print("Example: python naver_finance.py 005930")
        print("Example: python naver_finance.py 069500 --etf")
        sys.exit(1)
    
    ticker = sys.argv[1]
    is_etf = '--etf' in sys.argv
    
    print(f"\n{'='*50}")
    print(f"네이버 금융 크롤러 테스트: {ticker}")
    print(f"{'='*50}\n")
    
    if is_etf:
        result = get_etf_quote(ticker)
    else:
        result = get_stock_quote(ticker)
    
    if result:
        print("\n결과:")
        for key, value in result.items():
            print(f"  {key}: {value}")
        
        # 캐시 테스트
        print(f"\n{'='*50}")
        print("캐시 테스트 (즉시 재요청)...")
        print(f"{'='*50}\n")
        
        result2 = get_etf_quote(ticker) if is_etf else get_stock_quote(ticker)
    else:
        print("데이터를 가져오지 못했습니다.")
