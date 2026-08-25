@echo off
REM ============================================================
REM  LunchRadar — one-time setup for Windows
REM  Installs all dependencies + creates the database.
REM  Run this ONCE after unzipping. Then use start.bat.
REM ============================================================
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  ❌ Node.js is not installed or not in PATH.
  echo     Download it from https://nodejs.org  ^(LTS version^) and run this again.
  echo.
  pause
  exit /b 1
)

echo.
echo  === Installing backend dependencies ===
cd backend
call npm install
if errorlevel 1 (
  echo.
  echo  ❌ Backend install failed. Check the error above.
  pause
  exit /b 1
)

echo.
echo  === Creating the database ^(seed^) ===
call npm run seed

echo.
echo  === Installing frontend dependencies ===
cd ..\frontend
call npm install
if errorlevel 1 (
  echo.
  echo  ❌ Frontend install failed. Check the error above.
  pause
  exit /b 1
)

echo.
echo  ============================================
echo   ✅ Setup complete!
echo     Now double-click START.BAT to run it.
echo  ============================================
pause
