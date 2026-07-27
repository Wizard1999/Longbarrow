@echo off
setlocal
cd /d "%~dp0"
title Greenmantle Production Build

where node >nul 2>nul
if errorlevel 1 (
  echo [Greenmantle] Node.js was not found.
  pause
  exit /b 1
)

if not exist node_modules\vite\bin\vite.js (
  echo [Greenmantle] Installing project dependencies...
  call npm install
  if errorlevel 1 pause & exit /b 1
)

call npm run build
set RESULT=%ERRORLEVEL%
echo.
if %RESULT%==0 (
  echo [Greenmantle] Build complete. Output: dist\
) else (
  echo [Greenmantle] Build failed with exit code %RESULT%.
)
pause
exit /b %RESULT%
