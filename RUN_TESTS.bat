@echo off
setlocal
cd /d "%~dp0"
title Longbarrow Verification

where node >nul 2>nul
if errorlevel 1 (
  echo [Longbarrow] Node.js was not found.
  pause
  exit /b 1
)

if not exist node_modules\vitest\vitest.mjs (
  echo [Longbarrow] Installing project dependencies...
  call npm install
  if errorlevel 1 pause & exit /b 1
)

call npm run verify
set RESULT=%ERRORLEVEL%
echo.
if %RESULT%==0 (
  echo [Longbarrow] All verification checks passed.
) else (
  echo [Longbarrow] Verification failed with exit code %RESULT%.
)
pause
exit /b %RESULT%
