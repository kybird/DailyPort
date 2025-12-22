@echo off
setlocal

:: Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"

:: Move to stock-data-service directory
cd /d "%SCRIPT_DIR%stock-data-service"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Could not find stock-data-service directory.
    pause
    exit /b 1
)

echo ===================================================
echo [DailyPort] Starting Stock Data Service (Daemon)
echo ===================================================
echo This window will stay open and strictly sync data.
echo Press Ctrl+C to stop.
echo.

:: Activate Conda Environment
call conda activate stock-data-service

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to activate conda environment 'stock-data-service'.
    pause
    exit /b 1
)

:: Run the script in daemon mode
python main.py --daemon

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Python script failed.
    pause
    exit /b 1
)

pause
