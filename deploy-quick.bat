@echo off
echo Quick Deploy - Photo Collage App
echo =================================
echo.

if not exist "photo-collage-app\package.json" (
    echo ERROR: Must run from Collage-Gallery root!
    pause
    exit /b 1
)

cd photo-collage-app
echo [1/3] Building...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    cd ..
    pause
    exit /b 1
)

echo [2/3] Deploying to GitHub Pages...
call npm run deploy
if %ERRORLEVEL% NEQ 0 (
    echo Deploy failed!
    cd ..
    pause
    exit /b 1
)

cd ..
echo [3/3] Pushing to GitHub...
git push origin master

echo.
echo ===================================
echo Done! Deployed successfully!
echo ===================================
echo Check: https://caquilina-veitch.github.io/Collage-Gallery
echo (May take 2-5 minutes to update)
echo.
pause