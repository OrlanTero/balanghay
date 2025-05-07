const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const SettingsStore = require("./settings-store");
const { createApiServer, IP_ADDRESS, PORT } = require("./api-server");
const fs = require("fs");
const db = require('./database/db');

// Add error handling for protocol registration which can cause the errors you're seeing
app.setAsDefaultProtocolClient = () => {
  // Intentionally empty to prevent protocol registration that might cause errors
  console.log('Protocol registration bypassed to prevent registration_protocol_win.cc errors');
};

// Handle Squirrel.windows startup events
if (process.platform === 'win32') {
  // Add extra error handling for Windows-specific operations
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    
    // Check if the error is related to the registry protocol that's causing issues
    if (error.message && error.message.includes('registration_protocol_win.cc')) {
      console.log('Caught a Windows registry protocol error - this is expected during first run');
    } else {
      // For other errors, we may want to show a dialog or report
      console.error('Unhandled error:', error);
    }
  });
}

// Skip automatic protocol registration if we're on Windows
if (process.platform === 'win32') {
  try {
    app.removeAsDefaultProtocolClient('balanghay');
  } catch (error) {
    console.log('Error removing protocol client, ignoring:', error.message);
  }
}

const {
  initDb,
  authenticate,
  authenticateWithPin,
  authenticateWithQR,
  getAllBooks,
  getBookById,
  addBook,
  updateBook,
  deleteBook,
  getAllMembers,
  getMemberById,
  addMember,
  updateMember,
  deleteMember,
  getAllUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
  updateMembersTable,
  updateBooksTable,
  updateLoansTable,
  updateBookCopiesTable,
  getAllLoans,
  getLoansByMember,
  getActiveLoans,
  getOverdueLoans,
  addLoan,
  updateLoan,
  returnBook,
  borrowBooks,
  returnBooks,
  returnBooksViaQRCode,
  resetDatabase,
  getAllShelves,
  getShelfById,
  addShelf,
  updateShelf,
  deleteShelf,
  getShelfContents,
  getAllBookCopies,
  getBookCopyById,
  getBookCopiesByBookId,
  addBookCopy,
  updateBookCopy,
  deleteBookCopy,
  moveBookCopy,
  getBookAvailability,
  updateShelvesTable,
  clearLoans,
  repairDatabase,
  getDashboardStats,
  getMostPopularBooks,
  getPopularCategories,
  getMonthlyCheckouts,
  getDatabasePath,
} = require("./database/db");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Set app name
app.setName('Balanghay Library System');

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Initialize settings store
const store = new SettingsStore({
  schema: {
    darkMode: {
      type: "boolean",
      default: false,
    },
    serverAddress: {
      type: "string",
      default: `http://${IP_ADDRESS}:${PORT}`,
    },
    apiAddress: {
      type: "string",
      default: `http://${IP_ADDRESS}:${PORT}`,
    },
    rememberUser: {
      type: "boolean",
      default: false,
    },
  },
});

let mainWindow;
let splashScreen;
let apiServer = null;

// Add this function before ensureDatabaseInitialized
/**
 * Checks the health of the database
 * Verifies that required tables exist and are accessible
 * @param {Object} db - The database connection
 * @returns {Promise<{success: boolean, message: string}>} - The result of the health check
 */
const checkDatabaseHealth = async (db) => {
  try {
    console.log("Checking database health...");
    
    // Check if essential tables exist
    const requiredTables = ['books', 'members', 'loans', 'users', 'book_copies', 'shelves'];
    const missingTables = [];
    
    for (const table of requiredTables) {
      const exists = await db.schema.hasTable(table);
      if (!exists) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      return {
        success: false,
        message: `Missing required tables: ${missingTables.join(', ')}`
      };
    }
    
    // Try a simple query on each table to check access
    for (const table of requiredTables) {
      await db(table).select('*').limit(1);
    }
    
    return {
      success: true,
      message: "Database health check passed"
    };
  } catch (error) {
    console.error("Database health check failed:", error);
    return {
      success: false,
      message: `Database health check failed: ${error.message}`
    };
  }
};

// Function to ensure the database is properly initialized before starting the app
const ensureDatabaseInitialized = async () => {
  try {
    console.log("Checking database status...");
    
    // Check if database file exists
    const dbPath = getDatabasePath();
    const dbExists = fs.existsSync(dbPath);
    
    if (!dbExists) {
      console.log("Database doesn't exist, initializing...");
      
      // Initialize the database by copying from template
      await initDb();
      console.log("Database created and initialized successfully");
    } else {
      console.log("Database exists, checking health...");
      
      // Initialize database connection
      const database = await initDb();
      
      // Run a health check on the existing database
      const result = await checkDatabaseHealth(database);
      
      if (!result.success) {
        console.error("Database health check failed:", result.message);
        throw new Error(`Database health check failed: ${result.message}`);
      }
      
      console.log("Database health check passed");
      
      // Ensure we have exactly one admin user with username/password of admin/admin
      const users = await getAllUsers();
      const adminUsers = users.filter(user => user.role === "admin" && user.username === "admin");
      
      if (adminUsers.length === 0) {
        console.log("Admin user not found, creating default admin user...");
        await addUser({
          username: "admin",
          email: "admin@balanghay.com",
          password: "admin",
          role: "admin",
          status: "active",
          pin_code: "123456",
          qr_auth_key: "ADMIN-" + Date.now()
        });
        console.log("Default admin user created");
      } else if (adminUsers.length > 1) {
        // If there are multiple admin users with username "admin", keep only one
        console.log("Multiple admin users found, keeping only one...");
        
        // Keep the first admin user and delete the rest
        for (let i = 1; i < adminUsers.length; i++) {
          await deleteUser(adminUsers[i].id);
        }
        
        // Update the first admin user's password to "admin"
        await updateUser(adminUsers[0].id, {
          password: "admin",
          status: "active"
        });
        
        console.log("Admin user accounts consolidated");
      } else {
        // Ensure the existing admin user has the correct password and is active
        await updateUser(adminUsers[0].id, {
          password: "admin",
          status: "active"
        });
        
        console.log("Admin user password reset to 'admin'");
      }
    }
    
    console.log("Database initialization complete");
    return true;
  } catch (error) {
    console.error("Database initialization error:", error);
    return false;
  }
};

// Set up session configuration for the windows
const configureSession = (session) => {
  // Configure CORS settings
  session.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders } = details;

    // Add CORS headers
    requestHeaders["Origin"] = "electron://balanghay";

    callback({ requestHeaders });
  });

  // Handle CORS preflight responses
  session.webRequest.onHeadersReceived((details, callback) => {
    const { responseHeaders } = details;

    // Add or append CORS headers to responses
    if (responseHeaders) {
      responseHeaders["Access-Control-Allow-Origin"] = ["*"];
      responseHeaders["Access-Control-Allow-Methods"] = [
        "GET, POST, PUT, DELETE, OPTIONS",
      ];
      responseHeaders["Access-Control-Allow-Headers"] = [
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      ];
    }

    callback({ responseHeaders });
  });

  // Set permission request handler
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow all permission requests
    callback(true);
  });
};

const createWindow = () => {
  console.log("Creating main window and splash screen");

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, "assets", "logo.png"),
    show: false, // Hide the window until it's ready
  });

  // Create splash screen
  splashScreen = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, "assets", "logo.png"),
  });

  // Configure sessions
  configureSession(mainWindow.webContents.session);
  configureSession(splashScreen.webContents.session);

  // Register permission handler to allow access to localhost:3001
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media" || permission === "geolocation") {
        callback(true);
      } else {
        callback(true);
      }
    }
  );

  // Set same permission handler for splash screen
  splashScreen.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      callback(true);
    }
  );

  // Allow CORS for specific domains
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Access-Control-Allow-Origin": ["*"],
        },
      });
    }
  );

  // Load splash screen
  splashScreen.loadFile(path.join(__dirname, "index.html"));
  splashScreen.center();

  // For debugging - only in development mode
  if (!isProduction) {
    splashScreen.webContents.openDevTools({ mode: "detach" });
  }

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Handle window ready-to-show event
  mainWindow.once("ready-to-show", () => {
    console.log("Main window ready to show");
  });

  // Initialize database
  initDb()
    .then(async () => {
      console.log("Database initialized");

      // Ensure database is properly set up with our new function
      try {
        console.log("Running complete database initialization check...");
        await ensureDatabaseInitialized();
        console.log("Database initialization check completed");
      } catch (err) {
        console.error("Error in database initialization check:", err);
      }

      // Ensure members table has all required fields for authentication
      try {
        console.log("Updating members table...");
        await updateMembersTable();
        console.log("Members table updated successfully");
      } catch (err) {
        console.error("Error updating members table:", err);
      }

      // DEBUG: Print all users in the database
      try {
        const users = await getAllUsers();
        console.log("=== EXISTING USERS IN DATABASE ===");
        console.log(
          JSON.stringify(
            users.map((user) => ({
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              pin_code: user.pin_code,
              status: user.status,
            })),
            null,
            2
          )
        );
        console.log("=== END USER LIST ===");

        // Also print members for debugging
        const members = await getAllMembers();
        console.log("=== EXISTING MEMBERS IN DATABASE ===");
        console.log(
          JSON.stringify(
            members.map((member) => ({
              id: member.id,
              name: member.name,
              email: member.email,
              pin: member.pin,
              qr_code: member.qr_code ? "Yes" : "No",
              status: member.status,
            })),
            null,
            2
          )
        );
        console.log("=== END MEMBERS LIST ===");
      } catch (err) {
        console.error("Error fetching users/members:", err);
      }

      // Close splash screen and show main window after database init (and a minimum time)
      setTimeout(() => {
        console.log("Closing splash screen and showing main window");
        if (splashScreen && !splashScreen.isDestroyed()) {
          splashScreen.close();
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();

          // For debugging - only in development mode
          if (!isProduction) {
            mainWindow.webContents.openDevTools();
          }
        }
      }, 3000);
    })
    .catch((err) => {
      console.error("Database initialization error:", err);
    });

  // Open the DevTools - only in development mode
  if (!isProduction) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed event
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  splashScreen.on("closed", () => {
    splashScreen = null;
  });
};

// Add more robust database initialization
async function ensureDbInitialized() {
  console.log("Ensuring database is properly initialized in main process...");
  try {
    // Initialize database as early as possible
    await db.getDb();
    
    // Verify the database has essential tables
    const database = await db.getDb();
    const hasUsers = await database.schema.hasTable('users');
    
    if (!hasUsers) {
      console.log("Essential tables missing, creating them...");
      await db.createEssentialTables(database);
      console.log("Essential tables created successfully");
    } else {
      console.log("Database already has essential tables");
    }
    
    // Check for admin user and create if missing
    const adminUser = await database('users').where({ username: 'admin' }).first();
    if (!adminUser) {
      console.log("Admin user missing, creating default admin...");
      
      // Hash the password
      const bcrypt = require('bcrypt');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin', salt);
      
      await database('users').insert({
        username: 'admin',
        email: 'admin@balanghay.com',
        password: hashedPassword,
        pin_code: '123456',
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log("Default admin user created with hashed password");
    } else {
      console.log("Admin user already exists");
    }
    
    return true;
  } catch (error) {
    console.error("Error initializing database:", error);
    return false;
  }
}

// Initialize the database when the app is ready
app.whenReady().then(() => {
  console.log("Application ready, initializing...");
  
  // Initialize database before setting up the application - more robust approach
  ensureDbInitialized().then((dbSuccess) => {
    console.log(`Database initialization ${dbSuccess ? 'succeeded' : 'failed'}`);
    
    // Continue with app initialization even if DB failed (may recover later)
    // Set up IPC handlers
    setupIpcHandlers();

    // Create window
    createWindow();

    // Set up API server
    const apiApp = createApiServer(ipcMain);
    apiServer = apiApp.listen(PORT, IP_ADDRESS, () => {
      console.log(`API server running on http://${IP_ADDRESS}:${PORT}`);
    });

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    // Fix issues with temporary files that might be causing problems
    if (process.platform === 'win32') {
      const tempFolder = path.join(app.getPath('temp'), app.getName());
      try {
        if (fs.existsSync(tempFolder)) {
          console.log(`Cleaning up temp folder: ${tempFolder}`);
          fs.rmSync(tempFolder, { recursive: true, force: true });
        }
      } catch (error) {
        console.error('Error cleaning temp folder:', error);
      }
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Close the API server if it exists
    if (apiServer) {
      apiServer.close(() => {
        console.log("API server closed");
      });
    }

    app.quit();
  }
});

// Function to set up IPC handlers
function setupIpcHandlers() {
  console.log("Setting up IPC handlers");

  // Authentication
  ipcMain.handle("auth:login", async (event, credentials) => {
    console.log(
      "auth:login handler received:",
      typeof credentials,
      credentials
    );

    // Handle various credential formats
    let userIdentifier = null;
    let userPin = null;

    try {
      // Add version information to logs
      console.log(`Application version: ${app.getVersion()}`);
      console.log(`Running from: ${app.getAppPath()}`);
      console.log(`Is packaged: ${app.isPackaged}`);
      
      // Complex object handling with detailed logging
      if (typeof credentials === "string") {
        // Simple string format - treat as PIN
        console.log("Credentials is a string, treating as PIN");
        userPin = credentials;
      } else if (typeof credentials === "object") {
        // Extract fields with comprehensive fallbacks
        userIdentifier = credentials.email || credentials.username || null;
        userPin =
          credentials.pin ||
          credentials.pin_code ||
          credentials.password ||
          null;

        console.log("Extracted credentials:", {
          has_identifier: !!userIdentifier,
          identifier_type: userIdentifier ? typeof userIdentifier : "none",
          has_pin: !!userPin,
          pin_length: userPin ? userPin.length : 0,
        });
      }

      if (!userIdentifier && !userPin) {
        console.error("No valid credentials provided");
        return {
          success: false,
          message: "No valid credentials provided",
        };
      }

      // Authenticate based on available credentials
      let result;
      try {
        if (userIdentifier) {
          console.log(`Authenticating with identifier: ${userIdentifier}`);
          result = await authenticate(userIdentifier, userPin);
        } else if (userPin) {
          console.log(`Authenticating with PIN only, length: ${userPin.length}`);
          result = await authenticateWithPin(userPin);
        }
        
        console.log(
          "Authentication result:",
          result.success ? "Success" : "Failed",
          result.message || ""
        );
        
        return result;
      } catch (authError) {
        console.error("Error during authentication:", authError);
        return {
          success: false,
          message: `Authentication process error: ${authError.message}`,
          error: authError.message
        };
      }
    } catch (error) {
      console.error("Error in auth:login handler:", error);
      return {
        success: false,
        message: `Authentication error: ${error.message}`,
        error: error.message,
      };
    }
  });

  ipcMain.handle("auth:loginWithPin", async (event, pin_data) => {
    try {
      console.log(
        "auth:loginWithPin handler received:",
        typeof pin_data,
        pin_data
      );
      
      // Log environment info
      console.log(`Is packaged: ${app.isPackaged}`);
      console.log(`App path: ${app.getAppPath()}`);

      // Handle various pin_data formats:
      // 1. String: direct PIN code
      // 2. Object with pin_code: { pin_code: "1234" }
      // 3. Object with pin: { pin: "1234" }
      let pin_code;

      if (typeof pin_data === "string") {
        // Direct PIN string
        pin_code = pin_data;
      } else if (typeof pin_data === "object") {
        // Object format - try different property names
        pin_code = pin_data.pin_code || pin_data.pin || null;
      } else {
        pin_code = null;
      }

      console.log(
        "Extracted PIN code for authentication, length:",
        pin_code ? pin_code.length : 0
      );

      if (!pin_code) {
        console.error("No PIN code provided in request");
        return { success: false, message: "No PIN code provided" };
      }

      // Call the authentication function
      try {
        const result = await authenticateWithPin(pin_code);
        console.log(
          "authenticateWithPin result:",
          result.success ? "Success" : "Failed",
          result.message || ""
        );
        return result;
      } catch (authError) {
        console.error("Error in authenticateWithPin:", authError);
        return {
          success: false,
          message: `PIN authentication process error: ${authError.message}`,
          error: authError.message
        };
      }
    } catch (error) {
      console.error(
        "Error occurred in handler for 'auth:loginWithPin':",
        error
      );
      return {
        success: false,
        message: `PIN authentication error: ${error.message}`,
        error: error.message,
      };
    }
  });

  ipcMain.handle(
    "auth:loginWithQR",
    async (event, { qr_auth_key, pin_code }) => {
      console.log("Auth login with QR request received");
      // Pass both QR auth key and PIN for verification
      return await authenticateWithQR(qr_auth_key, pin_code);
    }
  );

  // QR code scanning is now handled in api-server.js

  // Settings handlers
  ipcMain.handle("settings:get", async () => {
    try {
      return {
        success: true,
        settings: store.store,
      };
    } catch (error) {
      console.error("Error getting settings:", error);
      return {
        success: false,
        message: "Failed to get settings",
        error: error.message,
      };
    }
  });

  ipcMain.handle("settings:save", async (event, settings) => {
    try {
      // Update only the provided settings
      Object.keys(settings).forEach((key) => {
        store.set(key, settings[key]);
      });

      return {
        success: true,
        settings: store.store,
      };
    } catch (error) {
      console.error("Error saving settings:", error);
      return {
        success: false,
        message: "Failed to save settings",
        error: error.message,
      };
    }
  });

  // User Management
  ipcMain.handle("users:getAll", async () => {
    return await getAllUsers();
  });

  ipcMain.handle("users:getById", async (event, id) => {
    return await getUserById(id);
  });

  ipcMain.handle("users:add", async (event, user) => {
    return await addUser(user);
  });

  ipcMain.handle("users:update", async (event, { id, user }) => {
    return await updateUser(id, user);
  });

  ipcMain.handle("users:delete", async (event, id) => {
    return await deleteUser(id);
  });

  // Books
  ipcMain.handle("books:getAll", async () => {
    return await getAllBooks();
  });

  ipcMain.handle("books:getById", async (event, id) => {
    return await getBookById(id);
  });

  ipcMain.handle("books:add", async (event, book) => {
    return await addBook(book);
  });

  ipcMain.handle("books:update", async (event, { id, book }) => {
    return await updateBook(id, book);
  });

  ipcMain.handle("books:delete", async (event, id) => {
    return await deleteBook(id);
  });

  // Make sure to update books table with the needed fields during initialization
  ipcMain.handle("books:updateTable", async () => {
    return await updateBooksTable();
  });

  // Members
  ipcMain.handle("members:getAll", async () => {
    return await getAllMembers();
  });

  ipcMain.handle("members:getById", async (event, id) => {
    return await getMemberById(id);
  });

  ipcMain.handle("members:add", async (event, member) => {
    return await addMember(member);
  });

  ipcMain.handle("members:update", async (event, { id, member }) => {
    return await updateMember(id, member);
  });

  ipcMain.handle("members:delete", async (event, id) => {
    return await deleteMember(id);
  });

  // Make sure to update members table with new fields during initialization
  ipcMain.handle("members:updateTable", async () => {
    return await updateMembersTable();
  });

  // Make sure to update loans table with book_copy_id field
  ipcMain.handle("loans:updateTable", async () => {
    return await updateLoansTable();
  });

  // Make sure to update book_copies table with copy_number field
  ipcMain.handle("bookcopies:updateTable", async () => {
    return await updateBookCopiesTable();
  });

  // Make sure to update shelves table with section and code fields
  ipcMain.handle("shelves:updateTable", async () => {
    return await updateShelvesTable();
  });

  // Database management
  ipcMain.handle("database:reset", async () => {
    try {
      console.log("Database reset requested through IPC");
      const result = await resetDatabase();
      return result;
    } catch (error) {
      console.error("Error in database:reset handler:", error);
      return {
        success: false,
        message: `Reset failed: ${error.message}`,
      };
    }
  });

  // Loans
  ipcMain.handle("loans:getAll", async () => {
    return await getAllLoans();
  });

  ipcMain.handle("loans:getByMember", async (event, memberId) => {
    return await getLoansByMember(memberId);
  });

  ipcMain.handle("loans:getActive", async () => {
    return await getActiveLoans();
  });

  ipcMain.handle("loans:getOverdue", async () => {
    return await getOverdueLoans();
  });

  ipcMain.handle("loans:add", async (event, loan) => {
    const result = await addLoan(loan);
    return result;
  });

  ipcMain.handle("loans:update", async (event, id, loan) => {
    const result = await updateLoan(id, loan);
    return result;
  });

  ipcMain.handle("loans:returnBook", async (event, id, reviewData) => {
    const result = await returnBook(id, reviewData);
    return result;
  });

  ipcMain.handle("loans:borrowBooks", async (event, memberData) => {
    const result = await borrowBooks(memberData);
    return result;
  });

  ipcMain.handle("loans:returnBooks", async (event, loanIds) => {
    const result = await returnBooks(loanIds);
    return result;
  });

  ipcMain.handle("loans:returnBooksViaQRCode", async (event, qrData) => {
    const result = await returnBooksViaQRCode(qrData);
    return result;
  });

  ipcMain.handle("loans:clearLoans", async () => {
    const result = await clearLoans();
    return result;
  });

  ipcMain.handle("loans:repairDatabase", async () => {
    const result = await repairDatabase();
    return result;
  });

  // Shelves
  ipcMain.handle("shelves:getAll", async () => {
    return await getAllShelves();
  });

  ipcMain.handle("shelves:getById", async (event, id) => {
    return await getShelfById(id);
  });

  ipcMain.handle("shelves:add", async (event, shelf) => {
    return await addShelf(shelf);
  });

  ipcMain.handle("shelves:update", async (event, { id, shelf }) => {
    return await updateShelf(id, shelf);
  });

  ipcMain.handle("shelves:delete", async (event, id) => {
    return await deleteShelf(id);
  });

  ipcMain.handle("shelves:getContents", async (event, shelfId) => {
    return await getShelfContents(shelfId);
  });

  // Book Copies
  ipcMain.handle("bookcopies:getAll", async () => {
    return await getAllBookCopies();
  });

  ipcMain.handle("bookcopies:getById", async (event, id) => {
    return await getBookCopyById(id);
  });

  ipcMain.handle("bookcopies:getByBookId", async (event, bookId) => {
    return await getBookCopiesByBookId(bookId);
  });

  ipcMain.handle("bookcopies:add", async (event, bookCopy) => {
    return await addBookCopy(bookCopy);
  });

  ipcMain.handle("bookcopies:update", async (event, { id, copy }) => {
    return await updateBookCopy(id, copy);
  });

  ipcMain.handle("bookcopies:delete", async (event, id) => {
    return await deleteBookCopy(id);
  });

  ipcMain.handle("bookcopies:move", async (event, { id, shelfId }) => {
    return await moveBookCopy(id, shelfId);
  });

  ipcMain.handle("books:getAvailability", async (event, bookId) => {
    return await getBookAvailability(bookId);
  });

  // Dashboard Statistics
  ipcMain.handle("dashboard:getStats", async () => {
    return await getDashboardStats();
  });

  ipcMain.handle("dashboard:getPopularBooks", async (event, limit = 5) => {
    return await getMostPopularBooks(limit);
  });

  ipcMain.handle("dashboard:getPopularCategories", async (event, limit = 5) => {
    return await getPopularCategories(limit);
  });

  ipcMain.handle("dashboard:getMonthlyCheckouts", async () => {
    return await getMonthlyCheckouts();
  });

  // Add handler for getting resource paths
  ipcMain.handle('get-resource-path', (event, resourceName) => {
    console.log(`Requested resource path for: ${resourceName}`);
    
    // The error logs show we need to fix paths for the packaged application
    // Check both unpacked and asar locations
    const possiblePaths = [
      // Main unpacked assets - preferred for binary resources
      path.join(process.resourcesPath, 'assets', resourceName),
      // In resources folder directly
      path.join(app.getAppPath(), 'assets', resourceName),
      // In src/assets directory inside asar
      path.join(app.getAppPath(), 'src', 'assets', resourceName),
      // For development mode
      path.join(__dirname, 'assets', resourceName)
    ];
    
    // Log for debugging
    console.log('Checking resource paths:');
    possiblePaths.forEach((p, i) => {
      try {
        const exists = fs.existsSync(p);
        console.log(`- Path ${i+1}: ${p} ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      } catch (err) {
        console.log(`- Path ${i+1}: ${p} ERROR: ${err.message}`);
      }
    });
    
    // For packaged apps, prefer protocol-based paths rather than file paths
    // This helps with asar archives
    try {
      // Return the first path that exists
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          // Convert to a file:// URL for consistent handling
          let resourceUrl = 'file://' + p.replace(/\\/g, '/');
          console.log('Found resource at:', resourceUrl);
          return resourceUrl;
        }
      }
    } catch (err) {
      console.error('Error checking resource paths:', err);
    }
    
    // If all else fails, return a direct path to resources folder so the fallback handler works
    return `file://${process.resourcesPath}/assets/${resourceName}`;
  });
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
