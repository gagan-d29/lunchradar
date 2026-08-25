@echo off
REM ============================================================
REM  LunchRadar — one-click start for Windows
REM  Opens the backend on :4000 and the frontend on :5173,
REM  then opens your browser. Use setup.bat first.
REM ============================================================
cd /d "%~dp0"

echo  Starting LunchRadar...
echo   - Backend  (API)  : http://localhost:4000
echo   - Frontend (App)  : http://localhost:5173
echo   Close the two windows that open to stop the app.
echo.

start "LunchRadar API (backend)" cmd /k "cd /d "%~dp0backend" && npm start"
start "LunchRadar App (frontend)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM wait a few seconds, then open the app in the browser
timeout /t 6 /nobreak >nul
start http://localhost:5173
