@echo off
setlocal
cd /d "%~dp0"

if not exist ".firebaserc" (
  echo Missing .firebaserc.
  echo Run SET_FIREBASE_PROJECT.bat first and paste your Firebase project ID.
  pause
  exit /b 1
)

echo Building production files...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo Build failed. Fix the issue above, then run this file again.
  pause
  exit /b 1
)

echo.
echo Uploading to Firebase Hosting...
call firebase deploy --only hosting
if errorlevel 1 (
  echo.
  echo Firebase upload failed. Check the message above.
  pause
  exit /b 1
)

echo.
echo Done. Your Firebase Hosting URL should be shown above.
pause
