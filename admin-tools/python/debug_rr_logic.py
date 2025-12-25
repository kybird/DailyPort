
import sys
import os
from datetime import datetime

# Add the directory to sys.path to import analyzer_daily
sys.path.append(os.path.join(os.getcwd(), 'admin-tools', 'python'))

import analyzer_daily

def test_005930_logic():
    ticker = "005930"
    print(f"Testing RR-based logic for {ticker}...")
    
    # This will fetch real data but won't upload if we just call the calculation part
    # However, analyzer_daily.py is structured to run everything.
    # Let's mock a scenario or just run the calculation function if exposed.
    # The solver is inside calculate_objectives_v3.
    
    # Let's extract history and run it manually
    import pykrx.stock as stock
    end_date = datetime.now().strftime("%Y%m%d")
    df = stock.get_market_ohlcv_by_date("20230101", end_date, ticker)
    current_price = int(df['종가'].iloc[-1])
    
    history_rows = []
    for idx, row in df.iloc[::-1].iterrows():
        history_rows.append({
            "close": int(row['종가']),
            "high": int(row['고가']),
            "low": int(row['저가']),
            "date": idx.strftime("%Y-%m-%d")
        })
        if len(history_rows) >= 150: break

    result = analyzer_daily.calculate_objectives_v3(current_price, history_rows)
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    test_005930_logic()
