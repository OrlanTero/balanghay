@echo off
echo Balanghay Library System - Database Reset
echo =======================================
echo.
echo WARNING: This will RESET the database to a clean state.
echo All existing data will be lost!
echo.
echo Press Ctrl+C to cancel or...
pause

:: Set environment variables
SET NODE_ENV=development

:: Create a temporary script that will delete the database and run the migration
echo const fs = require('fs'); > temp_reset.js
echo const path = require('path'); >> temp_reset.js
echo const { getDatabasePath, runMigration } = require('./database/initialize'); >> temp_reset.js
echo. >> temp_reset.js
echo const resetDatabase = async () => { >> temp_reset.js
echo   try { >> temp_reset.js
echo     // Get the database path >> temp_reset.js
echo     const dbPath = getDatabasePath(); >> temp_reset.js
echo     console.log(`Database located at: ${dbPath}`); >> temp_reset.js
echo. >> temp_reset.js
echo     // Check if database exists and delete it >> temp_reset.js
echo     if (fs.existsSync(dbPath)) { >> temp_reset.js
echo       console.log('Deleting existing database...'); >> temp_reset.js
echo       fs.unlinkSync(dbPath); >> temp_reset.js
echo       console.log('Database deleted successfully'); >> temp_reset.js
echo     } else { >> temp_reset.js
echo       console.log('No existing database found'); >> temp_reset.js
echo     } >> temp_reset.js
echo. >> temp_reset.js
echo     // Run migration to create fresh database >> temp_reset.js
echo     console.log('Creating fresh database...'); >> temp_reset.js
echo     await runMigration(); >> temp_reset.js
echo     console.log('Database reset completed successfully!'); >> temp_reset.js
echo. >> temp_reset.js
echo     // Clean up temporary script >> temp_reset.js
echo     setTimeout(() => { >> temp_reset.js
echo       try { >> temp_reset.js
echo         fs.unlinkSync(__filename); >> temp_reset.js
echo       } catch (err) { >> temp_reset.js
echo         console.log('Could not clean up temporary script'); >> temp_reset.js
echo       } >> temp_reset.js
echo     }, 1000); >> temp_reset.js
echo. >> temp_reset.js
echo   } catch (error) { >> temp_reset.js
echo     console.error('Error during database reset:', error); >> temp_reset.js
echo   } >> temp_reset.js
echo }; >> temp_reset.js
echo. >> temp_reset.js
echo resetDatabase(); >> temp_reset.js

:: Run the temporary script
node temp_reset.js

echo.
echo Reset completed. A fresh database has been created with a single admin user:
echo   Username: admin
echo   Password: admin
echo   PIN: 000001
echo.
echo Press any key to exit...
pause > nul 