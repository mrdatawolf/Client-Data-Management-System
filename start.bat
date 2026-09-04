@echo off
setlocal

rem Always run from the folder this script lives in, regardless of where
rem it was launched from (double-click, shortcut, Task Scheduler, etc.).
cd /d "%~dp0"

set APP_VERSION=unknown
for /f "delims=" %%v in ('node -p "require('./package.json').version" 2^>nul') do set APP_VERSION=%%v

echo ============================================
echo  Client Data Management System
echo  Version: %APP_VERSION%
echo ============================================
echo.

if not exist "package.json" (
    echo ERROR: package.json not found in %cd%.
    echo This script must live in the project root.
    goto :fail
)

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js was not found on PATH. Install Node.js and try again.
    goto :fail
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm was not found on PATH. Install Node.js and try again.
    goto :fail
)

if not exist ".env" (
    echo ERROR: .env not found in %cd%.
    echo Copy .env.example to .env and configure it before starting the server.
    goto :fail
)

if not exist "node_modules" (
    echo node_modules not found - running npm install...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed. See output above.
        goto :fail
    )
    echo.
)

echo Building...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed. See output above.
    goto :fail
)

echo.
echo Starting server, version %APP_VERSION%...
echo Open your browser to: http://localhost:6030
echo Press Ctrl+C to stop the server.
echo.
call npm run start

echo.
echo Server stopped.
pause
exit /b 0

:fail
echo.
pause
exit /b 1
