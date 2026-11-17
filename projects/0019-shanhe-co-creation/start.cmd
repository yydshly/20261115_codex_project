@echo off
cd /d "%~dp0..\.."
python projects\0019-shanhe-co-creation\scripts\build.py --site-preview
if errorlevel 1 exit /b 1
python projects\0019-shanhe-co-creation\scripts\serve.py
