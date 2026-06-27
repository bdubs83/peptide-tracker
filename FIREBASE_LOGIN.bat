@echo off
setlocal
cd /d "%~dp0"

echo Opening Firebase login...
call firebase login

echo.
echo Done. If login worked, run SET_FIREBASE_PROJECT.bat after you have the project ID.
pause
