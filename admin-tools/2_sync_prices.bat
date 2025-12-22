@echo off
setlocal
cd /d "%~dp0"

echo [Admin] Syncing Stock Prices...
echo Activating Conda Environment...
call conda activate stock-data-service

:: Call the node wrapper
node sync-stocks.js
pause
