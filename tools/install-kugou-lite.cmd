@echo off
set HTTP_PROXY=http://127.0.0.1:7897
set HTTPS_PROXY=http://127.0.0.1:7897
cd /d "%~dp0..\vendor\KuGouMusicApi"
npm.cmd install --omit=dev --no-fund --no-audit
echo EXITCODE=%ERRORLEVEL%

