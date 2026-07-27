@echo off
setlocal
cd /d "%~dp0"
title Longbarrow Website Launcher

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [Longbarrow] Node.js was not found.
  echo Install the current Node.js LTS release, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules\vite\bin\vite.js (
  echo [Longbarrow] Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo [Longbarrow] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo [Longbarrow] Starting the development website...
echo [Longbarrow] The landing page will open automatically.
echo [Longbarrow] Leave this window open while viewing or playing.
echo.
call npm run dev -- --open /development.html

if errorlevel 1 (
  echo.
  echo [Longbarrow] The development server stopped with an error.
  pause
)
