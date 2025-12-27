@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   DailyPort Local Data Engine ^& Analysis
echo ==========================================

echo.
echo [1/3] Initializing SQLite Database Master...
python admin-tools/python/db_init.py

echo.
echo [2/4] Running Full Market Sync (SQLite)...
python admin-tools/python/batch_daily.py

echo.
echo [2.5/4] Syncing Price Data to Supabase...
python admin-tools/python/sync_to_supabase_price.py

echo.
echo [3/4] Updating Financials (ROE/Operating Margin)...
python admin-tools/python/batch_financial_quarterly.py

echo.
echo [4/4] Analyzing and Uploading to Supabase...
python admin-tools/python/analyzer_daily.py

echo.
echo ==========================================
echo   All Tasks Completed.
echo ==========================================
pause
