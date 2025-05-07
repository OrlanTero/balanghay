@echo off
echo Balanghay Library System - Fix Registry Errors
echo ============================================
echo.
echo This tool will clean up registry entries that may cause errors with Electron protocol handling.
echo.

:: Check if running as administrator
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo This script requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    echo.
    echo Press any key to exit...
    pause > nul
    exit /b 1
)

echo Running with administrator privileges. Proceeding...
echo.

:: Clean up electron protocol registrations
echo Cleaning up Electron protocol registrations...
reg delete "HKCU\Software\Classes\balanghay" /f >nul 2>&1
reg delete "HKCU\Software\Classes\electron.balanghay" /f >nul 2>&1
reg delete "HKCU\Software\Classes\electron.balanghay.app" /f >nul 2>&1
reg delete "HKCU\Software\Classes\balanghaylibrary" /f >nul 2>&1

:: Clean up Electron app registrations
echo Cleaning up Electron app registrations...
reg delete "HKCU\Software\Classes\Applications\Balanghay Library System.exe" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\Balanghay Library System.exe" /f >nul 2>&1

:: Clear other related registry areas
echo Cleaning up additional registry entries...
reg delete "HKCU\Software\Balanghay" /f >nul 2>&1
reg delete "HKCU\Software\Electron\balanghay" /f >nul 2>&1

echo.
echo Registry cleanup completed successfully!
echo This should fix any protocol registration errors when starting the application.
echo.
echo Press any key to exit...
pause > nul

exit /b 0 