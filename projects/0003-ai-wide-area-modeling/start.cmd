@echo off
cd /d "%~dp0..\.."
python -X utf8 scripts\build_site.py --local-preview-only
if errorlevel 1 exit /b 1
python -X utf8 projects\0003-ai-wide-area-modeling\scripts\serve.py
