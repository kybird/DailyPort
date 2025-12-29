@echo off
pushd "%~dp0"
powershell -ExecutionPolicy Bypass -File "admin-tools\db_upload.ps1"
pause
popd
