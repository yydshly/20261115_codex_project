@echo off
cd /d "%~dp0"
python scripts\build.py
if errorlevel 1 exit /b 1
echo Open http://127.0.0.1:52918/ in your browser. Press Ctrl+C to stop.
python -m http.server 52918 --bind 127.0.0.1 --directory dist
