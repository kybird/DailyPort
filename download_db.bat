@echo off
pushd "%~dp0"
powershell -ExecutionPolicy Bypass -File "admin-tools\db_download.ps1"
pause
popd
