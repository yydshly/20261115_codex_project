@echo off
cd /d "%~dp0"
python -X utf8 scripts\build.py
if errorlevel 1 exit /b 1
echo Open http://127.0.0.1:52932/
python -m http.server 52932 --bind 127.0.0.1 --directory dist
