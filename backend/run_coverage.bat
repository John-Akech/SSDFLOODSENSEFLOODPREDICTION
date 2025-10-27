@echo off
echo Running tests with coverage...
cd /d "%~dp0"
pytest tests/ --cov=app --cov-report=html --cov-report=term -v
echo.
echo Coverage report generated in htmlcov/index.html
pause
