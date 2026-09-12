@echo off
cd /d "%~dp0..\vendor\KuGouMusicApi"
set HOST=127.0.0.1
set PORT=17965
set platform=lite
start "kugou-lite" /MIN cmd /c "node app.js"
echo started