@echo off
setlocal enabledelayedexpansion
echo Starting VO2 Max Coach development server...
echo.

REM Choose an open port (defaults to 8000, scans up to 8100)
set "DEFAULT_PORT=8000"
set "MAX_PORT=8100"
if not "%~1"=="" (
    set "START_PORT=%~1"
) else (
    set "START_PORT=%DEFAULT_PORT%"
)

call :find_free_port %START_PORT% %MAX_PORT%
if "%FREE_PORT%"=="" (
    echo ERROR: No available port between %START_PORT% and %MAX_PORT%.
    exit /b 1
)
set "PORT=%FREE_PORT%"
echo Using port %PORT% (override by running: d.bat <port>)
echo.

REM Try Python 3 first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python to start HTTP server...
    echo Server running at http://localhost:%PORT%
    echo Press Ctrl+C to stop the server
    echo.
    python -m http.server %PORT%
    goto :end
)

REM Try Python 3 with python3 command
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python 3 to start HTTP server...
    echo Server running at http://localhost:%PORT%
    echo Press Ctrl+C to stop the server
    echo.
    python3 -m http.server %PORT%
    goto :end
)

REM Try Node.js http-server if available
where npx >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js http-server...
    echo Server running at http://localhost:%PORT%
    echo Press Ctrl+C to stop the server
    echo.
    npx --yes http-server -p %PORT% -c-1
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
endlocal
goto :eof

REM Find a free TCP port between start and end (inclusive).
:find_free_port
setlocal
set "FREE_PORT="
for /l %%P in (%1,1,%2) do (
    netstat -ano | findstr /R /C:":%%P " /C:"]:%%P" >nul
    if errorlevel 1 (
        endlocal & set "FREE_PORT=%%P" & goto :eof
    )
)
endlocal
goto :eof
