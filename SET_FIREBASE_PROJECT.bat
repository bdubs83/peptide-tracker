@echo off
setlocal
cd /d "%~dp0"

set /p PROJECT_ID=Paste Firebase project ID and press Enter: 
if "%PROJECT_ID%"=="" (
  echo No project ID entered.
  pause
  exit /b 1
)

(
  echo {
  echo   "projects": {
  echo     "default": "%PROJECT_ID%"
  echo   }
  echo }
) > .firebaserc

echo.
echo Firebase project set to %PROJECT_ID%.
echo You can now run DEPLOY_TO_FIREBASE.bat.
pause
