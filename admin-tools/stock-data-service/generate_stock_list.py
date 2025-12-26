
import os
import sys
import json
from datetime import datetime
from pykrx import stock

# Hangul Choseong (Initials) List
CHOSEONG_LIST = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
]

def get_choseong(text):
    """
    Extract Choseong (Initials) from Hangul string.
    Example: 삼성전자 -> ㅅㅅㅈㅈ
    """
    result = []
    for char in text:
        if '가' <= char <= '힣':
            # Unicode arithmetic to find Choseong index
            char_code = ord(char) - 0xAC00
            choseong_index = char_code // 588
            result.append(CHOSEONG_LIST[choseong_index])
        else:
            result.append(char) # Keep non-Hangul chars as-is
    return "".join(result)

def generate_stock_list():
    today = datetime.now().strftime("%Y%m%d")
    print(f"Fetching stock list for {today}...")

    markets = [
        {"type": "KOSPI", "tickers": stock.get_market_ticker_list(today, market="KOSPI")},
        {"type": "KOSDAQ", "tickers": stock.get_market_ticker_list(today, market="KOSDAQ")}
    ]

    all_stocks = []

    for market in markets:
        print(f"Processing {market['type']} ({len(market['tickers'])} items)...")
        for ticker in market['tickers']:
            try:
                name = stock.get_market_ticker_name(ticker)
                
                # Use ticker directly as the identifier without market suffix
                full_ticker = ticker
                
                initials = get_choseong(name)

                all_stocks.append({
                    "ticker": full_ticker,
                    "code": ticker,
                    "name": name,
                    "market": market['type'],
                    "chosung": initials
                })
            except Exception as e:
                print(f"Error processing {ticker}: {e}")

    # Sort by name
    all_stocks.sort(key=lambda x: x['name'])

    # Save to file
    # We want to save this to admin-tools/stock.json (relative to this script?)
    # Ideally, save strictly to where the user requested: admin-tools
    # Assuming script runs in stock-data-service, admin-tools is ../admin-tools
    
    # Save to src/data/stocks.json for the Next.js App to use
    
    # Calculate path relative to this script: ../../src/data/stocks.json
    output_dir = os.path.join(os.path.dirname(__file__), '../../src/data')
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, 'stocks.json')

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_stocks, f, ensure_ascii=False, indent=2)

    print(f"Successfully saved {len(all_stocks)} stocks to {output_file}")

if __name__ == "__main__":
    generate_stock_list()
