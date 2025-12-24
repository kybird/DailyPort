@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   DailyPort Local Data Engine & Analysis
echo ==========================================

echo.
echo [1/3] Initializing SQLite Database...
python admin-tools/db_init.py

echo.
echo [2/3] Running Daily Batch (Test Mode: 5 stocks)...
python admin-tools/batch_daily.py --test

echo.
echo [3/3] Running Daily Analyzer...
python admin-tools/analyzer_daily.py

echo.
echo ==========================================
echo   All Tasks Completed.
echo ==========================================
pause
