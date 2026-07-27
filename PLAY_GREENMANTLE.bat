@echo off
setlocal
cd /d "%~dp0"
title Greenmantle Development Launcher

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [Greenmantle] Node.js was not found.
  echo Install the current Node.js LTS release, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules\vite\bin\vite.js (
  echo [Greenmantle] Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo [Greenmantle] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo [Greenmantle] Starting development server...
echo [Greenmantle] Your browser will open automatically.
echo [Greenmantle] Leave this window open while playing.
echo.
call npm run dev -- --open

if errorlevel 1 (
  echo.
  echo [Greenmantle] The development server stopped with an error.
  pause
)
