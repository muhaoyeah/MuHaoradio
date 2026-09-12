@echo off
cd /d "%~dp0\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-win.ps1"
exit /b %ERRORLEVEL%
