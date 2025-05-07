@echo off
echo Balanghay Library System - Database Migration
echo =============================================
echo.

:: Set the correct Node environment
SET NODE_ENV=development

:: Run the migration script
node migrate-db.js

echo.
echo Press any key to exit...
pause > nul 