@echo off
echo ========================================
echo   StrataDesk v2.0 - Deployment Check
echo ========================================
echo.

echo Checking files...
echo.

if exist index.html (
    echo [OK] index.html found
) else (
    echo [ERROR] index.html missing!
    pause
    exit /b 1
)

if exist styles.css (
    echo [OK] styles.css found
) else (
    echo [ERROR] styles.css missing!
    pause
    exit /b 1
)

if exist app.js (
    echo [OK] app.js found
) else (
    echo [ERROR] app.js missing!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   All files present!
echo ========================================
echo.
echo Opening StrataDesk in your browser...
echo.
echo If you don't see changes:
echo 1. Press Ctrl+F5 to hard refresh
echo 2. Or clear browser cache
echo.

start index.html

echo.
echo ========================================
echo   StrataDesk is now running!
echo ========================================
echo.
echo New Features in v2.0:
echo - Location search bar on map
echo - Enhanced Excel/PDF extraction
echo - Confidence scoring system
echo - Improved design and animations
echo.
pause
