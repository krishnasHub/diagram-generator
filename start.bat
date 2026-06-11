@echo off
echo ===================================
echo   AI Diagram Generator
echo ===================================
echo.
echo Backend:  http://localhost:3002
echo Frontend: http://localhost:5174
echo.

:: Kill any stale process on port 3002
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3002 " ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
)

:: Start backend in a new window
start "Diagram Generator - Backend" /min cmd /c "node server.js"

:: Give the server a moment to bind
timeout /t 2 /nobreak >nul

:: Start frontend (blocking — closing this window stops everything)
cd client
npm run dev

cd ..
