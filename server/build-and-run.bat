@echo off
echo Balanghay Library System - Build and Run Script
echo ==============================================
echo.

:: Set development environment vars
SET NODE_ENV=development

echo Step 1: Initializing the database...
call node migrate-db.js
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Error during database initialization! Continuing anyway...
  echo.
)

echo Step 2: Building the application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Error during webpack build! Exiting.
  goto :error
)
echo Webpack build completed successfully.
echo.

echo Step 3: Packaging the application...
SET NODE_ENV=production
call npm run package
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Error during packaging! Exiting.
  goto :error
)
echo Packaging completed successfully.
echo.

echo Step 4: Starting the packaged application...
echo.
echo IMPORTANT: If you encounter registry protocol errors, they can be safely ignored.
echo These are related to Electron's protocol handler registration and don't affect functionality.
echo.

:: Run the packaged application
cd out\Balanghay Library System-win32-x64
start "Balanghay" "Balanghay Library System.exe"
cd ..\..

echo Application started! Check the application window.
goto :end

:error
echo.
echo Build process failed. Please check the errors above.
pause
exit /b 1

:end
echo.
echo Process completed successfully.
pause 