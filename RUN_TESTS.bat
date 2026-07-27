@echo off
setlocal
cd /d "%~dp0"
title Greenmantle Verification

where node >nul 2>nul
if errorlevel 1 (
  echo [Greenmantle] Node.js was not found.
  pause
  exit /b 1
)

if not exist node_modules\vitest\vitest.mjs (
  echo [Greenmantle] Installing project dependencies...
  call npm install
  if errorlevel 1 pause & exit /b 1
)

call npm run verify
set RESULT=%ERRORLEVEL%
echo.
if %RESULT%==0 (
  echo [Greenmantle] All verification checks passed.
) else (
  echo [Greenmantle] Verification failed with exit code %RESULT%.
)
pause
exit /b %RESULT%
