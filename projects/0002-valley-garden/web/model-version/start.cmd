@echo off
cd /d "%~dp0"
node launch-model.mjs
if errorlevel 1 pause
