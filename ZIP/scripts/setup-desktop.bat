@echo off
echo Setting up StrataDesk Desktop App...

REM Create icons directory if it doesn't exist
if not exist "icons" mkdir icons

echo.
echo ✅ Step 1: Save the logo image
echo Please save the provided logo image as "icons/icon.png"
echo The image should be at least 512x512 pixels for best results.
echo.
echo Press any key when you have saved the logo image...
pause >nul

REM Check if icon exists
if not exist "icons\icon.png" (
    echo ❌ Error: icons/icon.png not found!
    echo Please save the logo image as "icons/icon.png" and try again.
    pause
    exit /b 1
)

echo ✅ Step 2: Icon found! Building the desktop app...
echo.

REM Build the application
npm run build-win

if %errorlevel% equ 0 (
    echo.
    echo 🎉 SUCCESS! StrataDesk desktop app has been built!
    echo.
    echo You can find the installer at:
    echo   dist\StrataDesk Setup 2.0.0.exe
    echo.
    echo And the portable version at:
    echo   dist\StrataDesk 2.0.0.exe
    echo.
    echo To install: Double-click the Setup.exe file
    echo To run portable: Double-click the portable .exe file
    echo.
) else (
    echo.
    echo ❌ Build failed! Check the error messages above.
    echo.
)

pause