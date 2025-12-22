@echo off
setlocal

:: Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"

:: Move to stock-data-service directory
cd /d "%SCRIPT_DIR%stock-data-service"

echo ===================================================
echo [DailyPort] Single Stock Sync Tester
echo ===================================================

:: Activate Conda Environment
call conda activate stock-data-service
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to activate conda environment.
    pause
    exit /b 1
)

:: Ask for ticker
set /p TICKER="Enter Ticker (Press Enter for Samsung Elec 005930.KS): "
if "%TICKER%"=="" set TICKER=005930.KS

echo.
echo Syncing %TICKER% ...
python main.py %TICKER%

pause
