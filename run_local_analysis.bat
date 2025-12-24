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
echo [2/3] Running Full Market Sync (SQLite)...
python admin-tools/python/batch_daily.py

echo.
echo [3/3] Analyzing and Uploading to Supabase...
python admin-tools/python/analyzer_daily.py

echo.
echo ==========================================
echo   All Tasks Completed.
echo ==========================================
pause
