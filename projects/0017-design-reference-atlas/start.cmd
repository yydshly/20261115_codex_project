@echo off
cd /d "%~dp0"
echo Open http://127.0.0.1:52927/web/ in your browser.
python scripts\serve.py --port 52927
pause
