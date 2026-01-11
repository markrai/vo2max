@echo off
echo Starting VO2 Max Coach development server...
echo.

REM Try Python 3 first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python to start HTTP server...
    echo Server running at http://localhost:8000
    echo Press Ctrl+C to stop the server
    echo.
    python -m http.server 8000
    goto :end
)

REM Try Python 3 with python3 command
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python 3 to start HTTP server...
    echo Server running at http://localhost:8000
    echo Press Ctrl+C to stop the server
    echo.
    python3 -m http.server 8000
    goto :end
)

REM Try Node.js http-server if available
where npx >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js http-server...
    echo Server running at http://localhost:8000
    echo Press Ctrl+C to stop the server
    echo.
    npx --yes http-server -p 8000 -c-1
    goto :end
)

REM If nothing works, show error
echo ERROR: No suitable HTTP server found.
echo.
echo Please install one of the following:
echo   1. Python 3 (recommended): https://www.python.org/downloads/
echo   2. Node.js: https://nodejs.org/
echo.
echo Or use any other local HTTP server to serve the files.
pause

:end
