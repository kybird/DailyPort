import pytest
from unittest.mock import MagicMock, patch
import json
from analyzer_daily import run_algo_screening, STRATEGY_META, GROUP_WEIGHT

def test_run_algo_screening_v5_full_flow():
    """Verify the full flow of v5 screening including confluence and metadata."""
    
    # Mock that behaves like sqlite3.Row: supports dict(row), row['key'], row[0]
    class RowMock:
        def __init__(self, data):
            self._data = data
            self._keys = list(data.keys())
            self._values = list(data.values())
        def __getitem__(self, key):
            if isinstance(key, int):
                return self._values[key]
            return self._data[key]
        def keys(self):
            return self._keys
        def __iter__(self):
            # dict() calls iter() and expects (key, value) pairs
            return iter(self._data.items())

    class MockCursor:
        def __init__(self):
            self.fetchone_val = None
            self.fetchall_val = []

        def execute(self, sql, params=None):
            sql_lower = sql.lower()
            
            # Reset
            self.fetchone_val = None
            self.fetchall_val = []

            # Data
            universe_data = [[1e12], [2e12], [3e12], [4e12], [5e12], [6e12], [70e9], [80e9], [90e9], [10e9]]
            value_data = {'code': '005930', 'per': 10, 'pbr': 1.0, 'roe': 15, 'operating_margin': 12, 'market_cap': 400e12, 'eps': 5000}
            twin_data = {'code': '000660', 'foreigner': 100e9, 'institution': 50e9, 'market_cap': 100e12, 'close': 150000}
            acc_stats_sum = [('005930', 50e9)]
            acc_detail = {'h': 80000, 'l': 75000, 'market_cap': 400e12}
            trend_data = {'code': '000660', 'close': 150000, 'open': 148000, 'high': 151000, 'volume': 2e6, 'market_cap': 100e12}
            vol_hist = [(1e6,)] * 20
            price_hist = [(150000, 151000)] * 120

            # Match more specific queries first!
            if "max(date)" in sql_lower:
                self.fetchone_val = ("20251225",)
            # Twin Engines: has daily_supply joined with daily_price
            elif "daily_supply" in sql_lower and "daily_price" in sql_lower:
                self.fetchall_val = [RowMock(twin_data)]
            # Value Picks: has operating_margin
            elif "operating_margin" in sql_lower:
                self.fetchall_val = [RowMock(value_data)]
            # Trend Following: p.close > p.open (note the p. prefix)
            elif "p.close > p.open" in sql_lower:
                self.fetchall_val = [RowMock(trend_data)]
            # Universe: market_cap from daily_price joined with tickers
            elif "market_cap" in sql_lower and "daily_price" in sql_lower and "join" in sql_lower and "tickers" in sql_lower:
                self.fetchall_val = universe_data
            # Foreigner Acc: sum(foreigner)
            elif "sum(foreigner)" in sql_lower:
                self.fetchall_val = acc_stats_sum
            # Foreigner Acc Detail: max(close) and min(close)
            elif "max(close)" in sql_lower and "min(close)" in sql_lower:
                self.fetchone_val = RowMock(acc_detail)
            # Vol History
            elif "volume from daily_price" in sql_lower:
                self.fetchall_val = vol_hist
            # Price History
            elif "limit 120" in sql_lower:
                self.fetchall_val = price_hist
            
            return self

        def fetchone(self):
            return self.fetchone_val

        def fetchall(self):
            return self.fetchall_val

    with patch('analyzer_daily.get_db_cursor') as mock_get_cur, \
         patch('analyzer_daily.supabase') as mock_supabase, \
         patch('analyzer_daily.notify_telegram') as mock_notify:
        
        mock_get_cur.return_value = MockCursor()
        
        # Run Screening
        result_tickers = run_algo_screening()
        
        # Assertions
        assert '005930' in result_tickers
        assert '000660' in result_tickers
        
        # Check Supabase calls
        upsert_call_args = mock_supabase.table().upsert.call_args[0][0]
        confluence_payload = next(p for p in upsert_call_args if p["strategy_name"] == "Confluence_Top")
        assert confluence_payload["details"]["status"] == "OK"
