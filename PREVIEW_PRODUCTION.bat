@echo off
setlocal
cd /d "%~dp0"

echo Building production files...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo Build failed. Fix the issue above, then run this file again.
  pause
  exit /b 1
)

echo.
echo Starting local production preview...
echo Open the local URL shown below.
call npm.cmd run preview -- --host 127.0.0.1
