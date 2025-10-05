@echo off
echo ============================================
echo Firebase Firestore Backup + Download Script
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
set LOCAL_BACKUP_DIR=firestore-backups\%BACKUP_FOLDER%

echo Project ID: %PROJECT_ID%
echo Cloud backup folder: %BACKUP_FOLDER%
echo Local download folder: %LOCAL_BACKUP_DIR%
echo.

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Firebase CLI is not installed or not in PATH
    echo Please install it first: npm install -g firebase-tools
    pause
    exit /b 1
)

REM Check if Google Cloud SDK is installed for gsutil
gsutil version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Google Cloud SDK (gsutil) not found.
    echo You can download backups manually from Firebase Console.
    echo Continuing with cloud backup only...
    set DOWNLOAD_ENABLED=false
) else (
    set DOWNLOAD_ENABLED=true
)

REM Check if user is logged in to Firebase
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

REM Export Firestore data to cloud
echo.
echo ============================================
echo STEP 1: Creating cloud backup...
echo ============================================
echo This may take a few minutes depending on your data size.
echo.

firebase firestore:export gs://%PROJECT_ID%.appspot.com/%BACKUP_FOLDER%

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Cloud backup failed!
    echo Check your permissions and try again.
    pause
    exit /b 1
)

echo.
echo ============================================
echo STEP 2: Downloading backup to local computer...
echo ============================================

if "%DOWNLOAD_ENABLED%"=="true" (
    REM Create local backup directory
    if not exist "firestore-backups" mkdir firestore-backups
    if not exist "%LOCAL_BACKUP_DIR%" mkdir "%LOCAL_BACKUP_DIR%"

    echo Downloading from: gs://%PROJECT_ID%.appspot.com/%BACKUP_FOLDER%
    echo To local folder: %LOCAL_BACKUP_DIR%
    echo.

    gsutil -m cp -r gs://%PROJECT_ID%.appspot.com/%BACKUP_FOLDER%/* "%LOCAL_BACKUP_DIR%"

    if %errorlevel% equ 0 (
        echo.
        echo ============================================
        echo SUCCESS! Backup completed and downloaded.
        echo ============================================
        echo.
        echo Cloud backup: gs://%PROJECT_ID%.appspot.com/%BACKUP_FOLDER%
        echo Local backup: %cd%\%LOCAL_BACKUP_DIR%
        echo.
        echo To restore this backup later, use:
        echo firebase firestore:import gs://%PROJECT_ID%.appspot.com/%BACKUP_FOLDER%
        echo.

        REM Open the local backup folder
        explorer "%LOCAL_BACKUP_DIR%"
    ) else (
        echo Download failed, but cloud backup exists at:
        echo gs://%PROJECT_ID%.appspot.com/%BACKUP_FOLDER%
    )
) else (
    echo.
    echo ============================================
    echo Cloud backup completed successfully!
    echo ============================================
    echo.
    echo Cloud backup location: gs://%PROJECT_ID%.appspot.com/%BACKUP_FOLDER%
    echo.
    echo To download manually:
    echo 1. Go to Firebase Console ^> Storage
    echo 2. Look for folder: %BACKUP_FOLDER%
    echo 3. Download the files
    echo.
    echo Or install Google Cloud SDK for automatic download:
    echo https://cloud.google.com/sdk/docs/install
    echo.
)

pause