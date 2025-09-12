@echo off
setlocal enabledelayedexpansion

REM Run from Source on Windows (Development Mode)
REM Launches the app directly from source code using Electron
REM VideoTranscriber Application - Following Electron Build Standards

REM Set colors
set RED=[91m
set GREEN=[92m
set YELLOW=[93m
set BLUE=[94m
set CYAN=[96m
set NC=[0m

REM Get script directory
cd /d "%~dp0"

echo %BLUE%[%TIME%]%NC% Starting VideoTranscriber from source (Windows)...

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[%TIME%] X%NC% Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[%TIME%] X%NC% npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Display Node and npm versions
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo %CYAN%[%TIME%] i%NC% Node version: %NODE_VERSION%
echo %CYAN%[%TIME%] i%NC% npm version: %NPM_VERSION%

REM Check if package.json exists
if not exist "package.json" (
    echo %RED%[%TIME%] X%NC% package.json not found. Make sure you're in the project root directory.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo %BLUE%[%TIME%]%NC% Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo %RED%[%TIME%] X%NC% Failed to install dependencies
        pause
        exit /b 1
    )
    echo %GREEN%[%TIME%] OK%NC% Dependencies installed
) else (
    echo %CYAN%[%TIME%] i%NC% Dependencies already installed
    REM Check if dependencies are up to date
    echo %BLUE%[%TIME%]%NC% Checking for dependency updates...
    call npm outdated >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo %CYAN%[%TIME%] i%NC% All dependencies are up to date
    ) else (
        echo %YELLOW%[%TIME%] !%NC% Some dependencies may be outdated. Run 'npm update' to update them.
    )
)

REM Check if Electron is installed
if not exist "node_modules\electron" (
    echo %YELLOW%[%TIME%] !%NC% Electron not found. Installing Electron...
    call npm install --save-dev electron
    if %ERRORLEVEL% NEQ 0 (
        echo %RED%[%TIME%] X%NC% Failed to install Electron
        pause
        exit /b 1
    )
    echo %GREEN%[%TIME%] OK%NC% Electron installed
)

REM Display project information from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"\"name\":" package.json') do (
    set APP_NAME=%%~a
)
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"\"version\":" package.json') do (
    set APP_VERSION=%%~a
)
echo %CYAN%[%TIME%] i%NC% Application: %APP_NAME% v%APP_VERSION%

REM Launch the app from source
echo.
echo %GREEN%==========================================%NC%
echo %GREEN%    VideoTranscriber Development Mode     %NC%
echo %GREEN%==========================================%NC%
echo.
echo %BLUE%[%TIME%]%NC% Launching application from source code...
echo %YELLOW%[%TIME%] !%NC% Press Ctrl+C to stop the application
echo.

REM Run the app in development mode
call npm start

REM Check exit code
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% EQU 0 (
    echo %GREEN%[%TIME%] OK%NC% Application session ended successfully
) else (
    echo %RED%[%TIME%] X%NC% Application terminated with error code: %EXIT_CODE%
)

echo.
echo %CYAN%[%TIME%] i%NC% To build for production, run: compile-build-dist.sh
echo %CYAN%[%TIME%] i%NC% To run compiled binary, use: run-windows.bat
pause