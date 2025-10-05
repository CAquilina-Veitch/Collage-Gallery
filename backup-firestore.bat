@echo off
echo ============================================
echo Firebase Firestore Backup Script
echo ============================================
echo.

REM Set your Firebase project ID
set PROJECT_ID=photo-collage-app-9e42d

REM Create backup folder with timestamp
for /f "tokens=1-4 delims=/ " %%i in ("%date%") do (
    set BACKUP_DATE=%%l-%%j-%%k
)
for /f "tokens=1-2 delims=: " %%i in ("%time%") do (
    set BACKUP_TIME=%%i-%%j
)
set BACKUP_FOLDER=firestore-backup-%BACKUP_DATE%-%BACKUP_TIME%

echo Project ID: %PROJECT_ID%
echo Backup folder: %BACKUP_FOLDER%
echo.

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Firebase CLI is not installed or not in PATH
    echo Please install it first: npm install -g firebase-tools
    pause
    exit /b 1
)

REM Check if user is logged in
echo Checking Firebase authentication...
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo You need to login to Firebase first.
    echo Running: firebase login
    firebase login
    if %errorlevel% neq 0 (
        echo Login failed. Exiting.
        pause
        exit /b 1
    )
)

REM Set the project
echo Setting Firebase project to %PROJECT_ID%...
firebase use %PROJECT_ID%
if %errorlevel% neq 0 (
    echo Failed to set project. Make sure project ID is correct.
    pause
    exit /b 1
)

REM Export Firestore data
echo.
echo Starting Firestore export...
echo This may take a few minutes depending on your data size.
echo.

firebase firestore:export gs://%PROJECT_ID%.appspot.com/%BACKUP_FOLDER%

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo SUCCESS! Firestore backup completed.
    echo ============================================
    echo.
    echo Backup location: gs://%PROJECT_ID%.appspot.com/%BACKUP_FOLDER%
    echo.
    echo To restore this backup later, use:
    echo firebase firestore:import gs://%PROJECT_ID%.appspot.com/%BACKUP_FOLDER%
    echo.
) else (
    echo.
    echo ============================================
    echo ERROR: Backup failed!
    echo ============================================
    echo.
    echo Common issues:
    echo 1. Make sure you have owner/editor permissions on the project
    echo 2. Firestore must be initialized in your project
    echo 3. Check your internet connection
    echo.
)

pause