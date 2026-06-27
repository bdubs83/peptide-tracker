@echo off
setlocal
cd /d "%~dp0"

echo Installing Firebase tools...
call npm.cmd install -g firebase-tools

echo.
echo Done. You can now run FIREBASE_LOGIN.bat.
pause
