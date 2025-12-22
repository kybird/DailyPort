@echo off
setlocal
cd /d "%~dp0"

echo [Admin] Updating Stock List...
echo Activating Conda Environment...
call conda activate stock-data-service

:: Check if conda activation worked (optional), then run node or python directly.
:: Since we are in batch, we can call python directly, but user wanted Node wrapper context.
:: Let's call the node wrapper for consistency, but we could just call python.
:: User said "admin 툴이 자바스크립트라도 파이선 호출가능하자나". 
:: calling node wrapper to keep the "Admin Tool = Node" abstraction.

node update-stock-list.js
pause
