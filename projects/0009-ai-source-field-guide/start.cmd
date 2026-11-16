@echo off
cd /d "%~dp0"
echo Open http://127.0.0.1:52919/ in your browser.
echo Press Ctrl+C in this terminal to stop the server.
python scripts\build.py
if errorlevel 1 exit /b 1
python -m http.server 52919 --bind 127.0.0.1 --directory dist
