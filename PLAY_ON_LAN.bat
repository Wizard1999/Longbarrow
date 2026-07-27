@echo off
setlocal
cd /d "%~dp0"
title Longbarrow LAN Play

echo ========================================
echo       LONGBARROW - LAN TEST SERVER
echo ========================================
echo.

where node >nul 2>nul || (
  echo ERROR: Node.js is not installed or is not on PATH.
  echo Install the current Node.js LTS release, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul || (
  echo ERROR: npm is not available on PATH.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing project dependencies...
  call npm install || goto :fail
)

echo Starting Longbarrow on your local network...
echo Share the Network URL printed below with another device on the same LAN.
echo Allow Node.js through Windows Firewall on Private networks if prompted.
echo.
call npm run dev:lan
goto :eof

:fail
echo.
echo Longbarrow could not start. Review the error above.
pause
exit /b 1
