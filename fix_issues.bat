@echo off
echo FloodSense - Quick Fix Script
echo =============================

echo.
echo 1. Stopping containers...
docker-compose down

echo.
echo 2. Authenticating Google Earth Engine...
python authenticate_gee.py

echo.
echo 3. Restarting containers...
docker-compose up -d

echo.
echo 4. Checking service status...
timeout /t 10 /nobreak > nul
docker-compose ps

echo.
echo 5. Testing endpoints...
echo Backend Health: 
curl -s http://localhost:8000/health | python -m json.tool 2>nul || echo "Backend not ready"

echo.
echo SAR Service Health:
curl -s http://localhost:8080/health | python -m json.tool 2>nul || echo "SAR service not ready"

echo.
echo 6. Access Points:
echo - Main App: http://localhost
echo - Backend API: http://localhost:8000/docs  
echo - SAR Service: http://localhost:8080
echo.
echo Fix complete! Check the logs if issues persist:
echo docker-compose logs -f
pause