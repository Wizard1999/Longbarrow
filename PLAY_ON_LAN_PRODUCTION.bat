@echo off
setlocal
cd /d "%~dp0"
title Longbarrow Production LAN Test

echo ========================================
echo   LONGBARROW - PRODUCTION LAN BUILD
echo ========================================
echo.

where node >nul 2>nul || (
  echo ERROR: Node.js is not installed or is not on PATH.
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

echo Building the optimized browser version...
call npm run build || goto :fail
echo.
echo Starting production preview on the local network...
echo Share the Network URL printed below with devices on the same LAN.
echo Keep this window open while people are testing.
echo.
call npm run preview:lan
goto :eof

:fail
echo.
echo Production LAN launch failed. Review the error above.
pause
exit /b 1
