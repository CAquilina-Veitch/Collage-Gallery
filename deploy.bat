@echo off
echo ========================================
echo   Photo Collage App - Deployment Script
echo ========================================
echo.

REM Check if we're in the correct directory
if not exist "photo-collage-app\package.json" (
    echo ERROR: Must run this script from the Collage-Gallery root directory!
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo [1/5] Checking for uncommitted changes...
git status --porcelain > temp_git_status.txt
for %%A in (temp_git_status.txt) do (
    if %%~zA GTR 0 (
        echo.
        echo WARNING: You have uncommitted changes:
        git status --short
        echo.
        set /p CONTINUE="Do you want to commit these changes? (y/n): "
        if /i "!CONTINUE!"=="y" (
            set /p COMMIT_MSG="Enter commit message: "
            git add .
            git commit -m "!COMMIT_MSG!"
        )
    )
)
del temp_git_status.txt 2>nul

echo.
echo [2/5] Building production bundle...
cd photo-collage-app
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    cd ..
    pause
    exit /b 1
)

echo.
echo [3/5] Deploying to GitHub Pages...
call npm run deploy
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Deploy to GitHub Pages failed!
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo [4/5] Pushing changes to GitHub...
git push origin master
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Push to GitHub failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Deployment Complete!
echo.
echo ========================================
echo   SUCCESS! Your app has been deployed!
echo ========================================
echo.
echo - GitHub Pages: https://caquilina-veitch.github.io/Collage-Gallery
echo - Repository: https://github.com/caquilina-veitch/Collage-Gallery
echo.
echo NOTE: GitHub Pages may take a few minutes to update.
echo.
pause