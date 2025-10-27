@echo off
echo ========================================
echo Starting FloodSense Services
echo ========================================
echo.

REM Start Backend
echo [1/2] Starting Backend API on port 8000...
start "FloodSense Backend" cmd /k "cd /d %~dp0backend && python app\main.py"
timeout /t 3 /nobreak >nul

REM Start SAR Detection
echo [2/2] Starting SAR Detection on port 8080...
start "FloodSense SAR" cmd /k "cd /d %~dp0ee-fastapi && python app.py"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All services started!
echo ========================================
echo Backend API: http://localhost:8000/docs
echo SAR Detection: http://localhost:8080
echo ========================================
echo.
echo Press any key to stop all services...
pause >nul

REM Kill all services
taskkill /FI "WindowTitle eq FloodSense Backend*" /T /F
taskkill /FI "WindowTitle eq FloodSense SAR*" /T /F
