
from pykrx import stock
from datetime import datetime
import pandas as pd

ticker = "005930" # Samsung
date = "20241224" # A recent date we saw in DB

print(f"Checking scale for {ticker} on {date}")

# 1. Get OHLCV (Trading Value is included)
df_ohlcv = stock.get_market_ohlcv_by_ticker(date, date, ticker)
total_val = df_ohlcv['거래대금'].iloc[0]
print(f"Total Trading Value: {total_val:,} Won")

# 2. Get Net Purchases
df_net = stock.get_market_net_purchases_of_equities_by_ticker(date, date, "KOSPI")
# Find ticker in the dataframe
row = df_net.loc[ticker]
for_net = row['외국인']
print(f"Foreigner Net Purchase (by ticker): {for_net:,} Won")

# 3. Get Trading Value by Date (Another way)
df_tv = stock.get_market_trading_value_by_date(date, date, ticker)
for_net_tv = df_tv['외국인합계'].iloc[0]
print(f"Foreigner Net Purchase (by date): {for_net_tv:,} Won")
