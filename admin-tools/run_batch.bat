@echo off
setlocal
cd /d "%~dp0"

echo [DailyPort] Starting Daily Data Sync...
echo ---------------------------------------

:: Activate Conda (Adjust path if your miniconda location is different, but 'conda activate' usually works if in PATH)
:: Trying standard activation hook if available
if exist "%UserProfile%\miniconda3\Scripts\activate.bat" (
    call "%UserProfile%\miniconda3\Scripts\activate.bat" base
) else (
    echo [Warning] Could not find Miniconda activation script. Assuming python is in PATH.
)

:: Run Python Script
cd python
python batch_daily.py

echo.
echo [DailyPort] Sync Finished.
pause
