@echo off
echo Building StrataDesk Desktop App...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not available
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Build the application
echo Building application for Windows...
npm run build-win

if %errorlevel% equ 0 (
    echo.
    echo ✅ Build completed successfully!
    echo.
    echo The installer can be found in the 'dist' folder:
    dir dist\*.exe 2>nul
    echo.
    echo You can also run the portable version directly from:
    dir dist\win-unpacked\*.exe 2>nul
    echo.
) else (
    echo.
    echo ❌ Build failed!
    echo Check the error messages above for details.
    echo.
)

pause