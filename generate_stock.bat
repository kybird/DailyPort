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
echo [DailyPort] Stock List Generator
echo ===================================================

:: Activate Conda Environment
:: We try commonly known paths for conda hook if 'conda' is not in PATH, 
:: but assuming user has conda in PATH as per Prerequisites.
call conda activate stock-data-service

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to activate conda environment 'stock-data-service'.
    echo.
    echo Possible reasons:
    echo 1. Conda is not installed or not in your PATH.
    echo 2. The environment 'stock-data-service' has not been created yet.
    echo.
    echo To create the environment, run:
    echo     cd stock-data-service
    echo     conda env create -f environment.yml
    echo.
    pause
    exit /b 1
)

:: Run the script
echo.
echo Running generate_stock_list.py...
python generate_stock_list.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Python script failed.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Stock list generated successfully.
pause
