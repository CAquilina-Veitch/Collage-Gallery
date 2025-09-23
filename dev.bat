@echo off
echo ==========================================
echo   Photo Collage App - Development Server
echo ==========================================
echo.

if not exist "photo-collage-app\package.json" (
    echo ERROR: Must run from Collage-Gallery root!
    pause
    exit /b 1
)

echo Starting development server...
echo.
echo The app will open in your browser at:
echo http://localhost:3000/Collage-Gallery
echo.
echo Press Ctrl+C to stop the server
echo.

cd photo-collage-app
npm start