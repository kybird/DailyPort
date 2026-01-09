
from pykrx import stock
import traceback

dates_to_test = [
    ("20260107", "Today"),
    ("20250124", "Historical")
]

sample_ticker = "005930" # Samsung Electronics

print("=== Starting PyKRX VALUE Verification for 005930 ===")
for date, desc in dates_to_test:
    print(f"\n[{desc}] Testing date: {date}")
    try:
        # Direct value fetch test
        print(f"   Fetching Trading Value for {sample_ticker}...")
        df = stock.get_market_trading_value_by_date(date, date, sample_ticker)
        if df is not None and not df.empty:
             print(f"   -> Data Found! Rows: {len(df)}")
             print(df.to_string())
        else:
             print("   -> No Data returned (Empty DataFrame).")

    except Exception:
        print(f"   -> Error occurred.")
        traceback.print_exc()
print("\n=== Verification Complete ===")
