const knex = require("knex");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");
const bcrypt = require("bcrypt");

// Initialize database instance
let db;

// Function to get the database path in production or development
const getDatabasePath = () => {
  // Determine if we're in production mode
  const isProduction = process.env.NODE_ENV === 'production';
  const isPackaged = app && app.isPackaged;

  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}, Packaged: ${isPackaged ? 'Yes' : 'No'}`);
  
  let dbPath;
  
  try {
    // In production packaged app, use the userData directory - this is guaranteed to be writable
    if (isPackaged) {
      try {
        // Get the userData path - this is the safest location for storing app data
        const userDataPath = app.getPath('userData');
        console.log(`Using userData path: ${userDataPath}`);
        
        // Create database subdirectory in userData
        dbPath = path.join(userDataPath, 'database');
        
        // Ensure the directory exists with proper permissions
        if (!fs.existsSync(dbPath)) {
          console.log(`Creating database directory: ${dbPath}`);
          fs.mkdirSync(dbPath, { recursive: true, mode: 0o755 });
        } else {
          // Check if directory is writable
          try {
            const testFile = path.join(dbPath, '.write-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            console.log(`Confirmed database directory is writable: ${dbPath}`);
          } catch (writeError) {
            console.error(`Directory exists but is not writable: ${dbPath}`, writeError);
            // Try a different location
            dbPath = path.join(app.getPath('temp'), 'balanghay-database');
            console.log(`Fallback to temp directory: ${dbPath}`);
            if (!fs.existsSync(dbPath)) {
              fs.mkdirSync(dbPath, { recursive: true, mode: 0o755 });
            }
          }
        }
      } catch (appPathError) {
        console.error(`Error getting app paths: ${appPathError.message}`);
        
        // Try to use %APPDATA% on Windows
        if (process.platform === 'win32') {
          try {
            const appDataPath = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
            dbPath = path.join(appDataPath, 'Balanghay', 'database');
            console.log(`Using Windows %APPDATA% path: ${dbPath}`);
            
            if (!fs.existsSync(dbPath)) {
              fs.mkdirSync(dbPath, { recursive: true });
              console.log(`Created database directory in %APPDATA%: ${dbPath}`);
            }
          } catch (winError) {
            console.error(`Error using Windows %APPDATA%: ${winError.message}`);
            // Last resort fallback to temp directory
            const tempDir = require('os').tmpdir();
            dbPath = path.join(tempDir, 'balanghay-database');
            console.log(`Emergency fallback to temp directory: ${dbPath}`);
            if (!fs.existsSync(dbPath)) {
              fs.mkdirSync(dbPath, { recursive: true });
            }
          }
        } else {
          // Last resort fallback to temp directory for non-Windows
          const tempDir = require('os').tmpdir();
          dbPath = path.join(tempDir, 'balanghay-database');
          console.log(`Emergency fallback to temp directory: ${dbPath}`);
          if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath, { recursive: true });
          }
        }
      }
    } else {
      // In development, use a local directory
      dbPath = path.join(__dirname, '..', '..', 'database');
      
      // Ensure development directory exists
      if (!fs.existsSync(dbPath)) {
        console.log(`Creating development database directory: ${dbPath}`);
        fs.mkdirSync(dbPath, { recursive: true });
      }
    }
    
    console.log(`Database path will be: ${dbPath}`);
    
    const fullPath = path.join(dbPath, "hiraya_balanghay.sqlite");
    console.log(`Full database path: ${fullPath}`);
    
    // Try to touch the file to ensure it's accessible
    if (!fs.existsSync(fullPath)) {
      try {
        fs.writeFileSync(fullPath, '', { flag: 'a' });
        console.log(`Successfully created/touched database file: ${fullPath}`);
      } catch (touchError) {
        console.error(`Error touching database file: ${touchError.message}`);
      }
    }
    
    return fullPath;
  } catch (error) {
    console.error(`Error resolving database path: ${error.message}`);
    
    // Try to use %APPDATA% as an explicit fallback for Windows
    if (process.platform === 'win32') {
      try {
        const appDataPath = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
        const winPath = path.join(appDataPath, 'Balanghay', 'database', "hiraya_balanghay.sqlite");
        console.log(`Trying Windows %APPDATA% path as fallback: ${winPath}`);
        
        // Create the directory if it doesn't exist
        const dirPath = path.dirname(winPath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          console.log(`Created directory: ${dirPath}`);
        }
        
        return winPath;
      } catch (winError) {
        console.error(`Windows %APPDATA% fallback failed: ${winError.message}`);
      }
    }
    
    // Fallback to OS temp directory in case of error
    const tempDir = require('os').tmpdir();
    const fallbackPath = path.join(tempDir, "hiraya_balanghay.sqlite");
    console.log(`Using fallback database path in temp dir: ${fallbackPath}`);
    return fallbackPath;
  }
};

// Function to get the template database path
const getTemplateDatabasePath = () => {
  // Need to handle both packaged and development environments
  const isPackaged = app && app.isPackaged;
  let templatePath;
  
  try {
    if (isPackaged) {
      // In production, template should be in the resources directory
      templatePath = path.join(process.resourcesPath, 'database', 'hiraya_balanghay.sqlite');
      console.log(`Looking for template database in resources: ${templatePath}`);
      
      // If not found in resources, try app directory
      if (!fs.existsSync(templatePath)) {
        templatePath = path.join(app.getAppPath(), 'database', 'hiraya_balanghay.sqlite');
        console.log(`Not found in resources, looking in app path: ${templatePath}`);
      }
    } else {
      // In development mode, use repository location
      templatePath = path.join(__dirname, '..', '..', 'database', 'hiraya_balanghay.sqlite');
      console.log(`Looking for template database in development path: ${templatePath}`);
    }
    
    // Check if the template exists
    if (fs.existsSync(templatePath)) {
      console.log(`Template database found at: ${templatePath}`);
    } else {
      console.log(`Template database not found at: ${templatePath}`);
    }
    
    return templatePath;
  } catch (error) {
    console.error(`Error resolving template database path: ${error.message}`);
    // Fallback to standard location
    return path.join(__dirname, '..', '..', 'database', 'hiraya_balanghay.sqlite');
  }
};

// Initialize database connection
const initDatabaseConnection = (dbFilePath) => {
  console.log(`Database environment: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}`);
  console.log(`Database will be stored at: ${dbFilePath}`);

  // Initialize knex connection using sqlite3
  return knex({
    client: "sqlite3",
    connection: {
      filename: dbFilePath,
    },
    useNullAsDefault: true,
    // Enable foreign key constraints
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      },
    },
  });
};

// Initialize the database
const initDb = async () => {
  if (db) return db;
  
  try {
    const dbFilePath = getDatabasePath();
    const templateDbPath = getTemplateDatabasePath();
    
    // Check if database exists at the target location
    const dbExists = fs.existsSync(dbFilePath);
    let databaseCreated = false;
    
    if (!dbExists) {
      console.log("Database does not exist, attempting to create it...");
      
      // Check if template database exists
      const templateExists = fs.existsSync(templateDbPath);
      if (templateExists) {
        try {
          // Create directory structure if needed
          const dbDir = path.dirname(dbFilePath);
          if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`Created database directory: ${dbDir}`);
          }
          
          // Copy the template database to the target location
          fs.copyFileSync(templateDbPath, dbFilePath);
          console.log(`Template database copied to ${dbFilePath}`);
          databaseCreated = true;
        } catch (copyError) {
          console.error(`Error copying template database: ${copyError.message}`);
          
          // Try to create an empty database file if template copy fails
          try {
            fs.writeFileSync(dbFilePath, '', { flag: 'wx' });
            databaseCreated = true;
            console.log(`Created new empty database file at ${dbFilePath}`);
          } catch (fileError) {
            console.error(`Error creating database file: ${fileError.message}`);
          }
        }
      } else {
        console.log(`Template database not found at ${templateDbPath}`);
        
        // Try to create an empty database file if template doesn't exist
        try {
          // Ensure directory exists first
          const dbDir = path.dirname(dbFilePath);
          if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`Created database directory: ${dbDir}`);
          }
          
          fs.writeFileSync(dbFilePath, '', { flag: 'wx' });
          databaseCreated = true;
          console.log(`Created new empty database file at ${dbFilePath}`);
        } catch (fileError) {
          console.error(`Error creating database file: ${fileError.message}`);
        }
      }
    } else {
      console.log(`Using existing database at ${dbFilePath}`);
    }
    
    // Create database connection
    db = initDatabaseConnection(dbFilePath);
    console.log("Database connection established");
    
    // Test the connection
    try {
      await db.raw("SELECT 1");
      console.log("Database connection test successful");
      
      // Ensure admin user exists
      await ensureAdminUser(db);
    } catch (testError) {
      console.error(`Database connection test failed: ${testError.message}`);
      
      // If there's an issue with the database file, try to recreate it
      if (fs.existsSync(dbFilePath)) {
        const backupPath = `${dbFilePath}.backup.${Date.now()}`;
        console.log(`Moving problematic database to ${backupPath}`);
        try {
          fs.renameSync(dbFilePath, backupPath);
          
          // Try copying the template again
          if (fs.existsSync(templateDbPath)) {
            fs.copyFileSync(templateDbPath, dbFilePath);
            console.log(`Template database copied to ${dbFilePath} after error`);
          } else {
            // Create a fresh database file if template isn't available
            fs.writeFileSync(dbFilePath, '');
            console.log(`Created empty database file at ${dbFilePath}`);
          }
          
          // Reinitialize the connection
          db = initDatabaseConnection(dbFilePath);
          console.log("Reinitialized database connection after recovery");
        } catch (recoveryError) {
          console.error(`Recovery failed: ${recoveryError.message}`);
        }
      }
    }
    
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    
    // One last attempt with in-memory database as a fallback
    try {
      console.log("Attempting to use in-memory SQLite database as fallback");
      db = knex({
        client: "sqlite3",
        connection: {
          filename: ":memory:"
        },
        useNullAsDefault: true
      });
      
      console.log("In-memory database initialized");
      
      return db;
    } catch (fallbackError) {
      console.error("In-memory database fallback failed:", fallbackError);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }
};

// Ensure admin user exists
const ensureAdminUser = async (database) => {
  try {
    // Check if users table exists
    const hasUsersTable = await database.schema.hasTable('users');
    if (!hasUsersTable) {
      console.log("Users table doesn't exist");
      return;
    }
    
    // Check if admin user exists
    const adminUser = await database('users').where({ username: 'admin' }).first();
    
    if (!adminUser) {
      console.log("Admin user not found, creating default admin account");
      
      // Create admin with hashed password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin', salt);
      
      await database('users').insert({
        username: 'admin',
        email: 'admin@balanghay.com',
        password: hashedPassword,
        pin_code: '000001',
        qr_auth_key: 'USER-admin-' + Date.now(),
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log("Default admin user created with username: admin, password: admin");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error ensuring admin user:", error);
  }
};

// DO NOT call initDb here - it will be called when needed
// This fixes the circular dependency issue

// Define all database query functions
// Using getDb function to ensure db is initialized for every call

const getDb = async () => {
  if (!db) {
    console.log("Database not initialized, initializing now...");
    return await initDb();
  }
  return db;
};

// Modified database functions to use getDb() to ensure db is initialized
const getAllBooks = async () => {
  const database = await getDb();
  return database("books").select("*");
};

const getBookById = async (id) => {
  const database = await getDb();
  console.log(`Looking up book with ID: ${id}, type: ${typeof id}`);
  return database("books")
    .where({ id: parseInt(id, 10) })
    .first()
    .then((book) => {
      if (!book) {
        console.log(`No book found with ID ${id}`);
      } else {
        console.log(`Found book: ${book.title}`);
      }
      return book;
    });
};

const addBook = async (book) => {
  const database = await getDb();
  return database("books").insert(book).returning("*");
};

const updateBook = async (id, book) => {
  const database = await getDb();
  return database("books").where({ id }).update(book).returning("*");
};

const deleteBook = async (id) => {
  const database = await getDb();
  return database("books").where({ id }).del();
};

const getAllMembers = async () => {
  const database = await getDb();
  return database("members").select("*");
};

const getMemberById = async (id) => {
  const database = await getDb();
  console.log(`DB: Getting member with ID: ${id}, type: ${typeof id}`);

  // Convert to number if it's a string and can be parsed
  let parsedId = id;
  if (typeof id === "string") {
    const numeric = parseInt(id, 10);
    if (!isNaN(numeric)) {
      parsedId = numeric;
      console.log(`DB: Converted string ID '${id}' to numeric ID: ${parsedId}`);
    }
  }

  return database("members")
    .where({ id: parsedId })
    .first()
    .then((member) => {
      console.log(
        member
          ? `DB: Found member: ${member.name}`
          : `DB: No member found with ID ${parsedId}`
      );
      return member;
    })
    .catch((err) => {
      console.error(`DB: Error fetching member with ID ${parsedId}:`, err);
      throw err;
    });
};

const addMember = async (member) => {
  const database = await getDb();
  return database("members").insert(member).returning("*");
};

const updateMember = async (id, member) => {
  const database = await getDb();
  return database("members").where({ id }).update(member).returning("*");
};

const deleteMember = async (id) => {
  const database = await getDb();
  return database("members").where({ id }).del();
};

const getAllLoans = async () => {
  const database = await getDb();
  return database("loans")
    .join("book_copies", "loans.book_copy_id", "book_copies.id")
    .join("books", "book_copies.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .select(
      "loans.*",
      "book_copies.barcode as book_barcode",
      "book_copies.location_code as book_location_code",
      "book_copies.status as book_status",
      "book_copies.condition as book_condition",
      "book_copies.acquisition_date as book_acquisition_date",
      "books.id as book_id",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.author as book_author",
      "books.cover_color as book_color",
      "books.front_cover as book_cover",
      "members.name as member_name",
      "members.email as member_email"
    )
    .orderBy("loans.checkout_date", "desc")
    .then(async (loans) => {
      console.log(`DB: Found ${loans.length} loans`);
      
      // Group loans by transaction_id if available
      const groupedLoans = [];
      const loanGroups = {};
      
      for (const loan of loans) {
        // If no transaction_id or is a single book transaction, handle normally
        if (!loan.transaction_id) {
          groupedLoans.push(loan);
          continue;
        }
        
        // Group loans with the same transaction_id
        if (!loanGroups[loan.transaction_id]) {
          loanGroups[loan.transaction_id] = {
            ...loan,
            is_batch: true,
            book_titles: [loan.book_title],
            book_ids: [loan.book_id],
            book_copy_ids: [loan.book_copy_id],
            book_barcodes: [loan.book_barcode],
            total_books: 1
          };
        } else {
          // Add this book's info to the existing group
          const group = loanGroups[loan.transaction_id];
          group.book_titles.push(loan.book_title);
          group.book_ids.push(loan.book_id);
          group.book_copy_ids.push(loan.book_copy_id);
          group.book_barcodes.push(loan.book_barcode);
          group.total_books += 1;
          
          // For multiple books, use a combined title
          group.book_title = `${group.total_books} books: ${group.book_titles.slice(0, 2).join(", ")}${group.total_books > 2 ? "..." : ""}`;
        }
      }
      
      // Add all transaction groups to the results
      for (const transactionId in loanGroups) {
        groupedLoans.push(loanGroups[transactionId]);
      }
      
      return groupedLoans;
    });
};

const getLoansByMember = async (memberId) => {
  console.log(
    `DB: Getting loans for member ID: ${memberId}, type: ${typeof memberId}`
  );

  // Convert to number if it's a string and can be parsed
  let id = memberId;
  if (typeof memberId === "string") {
    const parsed = parseInt(memberId, 10);
    if (!isNaN(parsed)) {
      id = parsed;
      console.log(`DB: Converted string ID '${memberId}' to numeric ID: ${id}`);
    }
  }

  id = id.toString().replace("member-", "");
  id = parseInt(id, 10);

  const database = await getDb();

  return database("loans")
    .join("book_copies", "loans.book_copy_id", "book_copies.id")
    .join("books", "book_copies.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .where("loans.member_id", id)
    .select(
      "loans.*",
      "book_copies.barcode as book_barcode",
      "book_copies.location_code as book_location_code",
      "book_copies.status as book_status",
      "book_copies.condition as book_condition",
      "book_copies.acquisition_date as book_acquisition_date",
      "books.id as book_id",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.author as book_author",
      "books.cover_color as book_color",
      "books.front_cover as book_cover",
      "members.name as member_name",
      "members.email as member_email"
    )
    .then(async (loans) => {
      console.log(`DB: Found ${loans.length} loans for member ID ${id}`);
      
      // Group loans by transaction_id if available
      const groupedLoans = [];
      const loanGroups = {};
      
      for (const loan of loans) {
        // If no transaction_id or is a single book transaction, handle normally
        if (!loan.transaction_id) {
          groupedLoans.push(loan);
          continue;
        }
        
        // Group loans with the same transaction_id
        if (!loanGroups[loan.transaction_id]) {
          loanGroups[loan.transaction_id] = {
            ...loan,
            is_batch: true,
            book_titles: [loan.book_title],
            book_ids: [loan.book_id],
            book_copy_ids: [loan.book_copy_id],
            book_barcodes: [loan.book_barcode],
            total_books: 1
          };
        } else {
          // Add this book's info to the existing group
          const group = loanGroups[loan.transaction_id];
          group.book_titles.push(loan.book_title);
          group.book_ids.push(loan.book_id);
          group.book_copy_ids.push(loan.book_copy_id);
          group.book_barcodes.push(loan.book_barcode);
          group.total_books += 1;
          
          // For multiple books, use a combined title
          group.book_title = `${group.total_books} books: ${group.book_titles.slice(0, 2).join(", ")}${group.total_books > 2 ? "..." : ""}`;
        }
      }
      
      // Add all transaction groups to the results
      for (const transactionId in loanGroups) {
        groupedLoans.push(loanGroups[transactionId]);
      }
      
      return groupedLoans;
    })
    .catch((err) => {
      console.error(`DB: Error fetching loans for member ID ${id}:`, err);
      throw err;
    });
};

const getActiveLoans = async () => {
  const database = await getDb();
  return database("loans")
    .join("book_copies", "loans.book_copy_id", "book_copies.id")
    .join("books", "book_copies.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .whereNull("loans.return_date")
    .andWhere(function() {
      this.where("loans.status", "Checked Out")
          .orWhere("loans.status", "Borrowed")
          .orWhere("loans.status", "Overdue");
    })
    .select(
      "loans.*",
      "book_copies.barcode as book_barcode",
      "book_copies.location_code as book_location_code",
      "book_copies.status as book_status",
      "book_copies.condition as book_condition",
      "book_copies.acquisition_date as book_acquisition_date",
      "books.id as book_id",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.author as book_author",
      "books.cover_color as book_color",
      "books.front_cover as book_cover",
      "members.name as member_name",
      "members.email as member_email"
    )
    .then(async (loans) => {
      console.log(`DB: Found ${loans.length} active loans`);
      
      // Group loans by transaction_id if available
      const groupedLoans = [];
      const loanGroups = {};
      
      for (const loan of loans) {
        // If no transaction_id or is a single book transaction, handle normally
        if (!loan.transaction_id) {
          groupedLoans.push(loan);
          continue;
        }
        
        // Group loans with the same transaction_id
        if (!loanGroups[loan.transaction_id]) {
          loanGroups[loan.transaction_id] = {
            ...loan,
            is_batch: true,
            book_titles: [loan.book_title],
            book_ids: [loan.book_id],
            book_copy_ids: [loan.book_copy_id],
            book_barcodes: [loan.book_barcode],
            total_books: 1
          };
        } else {
          // Add this book's info to the existing group
          const group = loanGroups[loan.transaction_id];
          group.book_titles.push(loan.book_title);
          group.book_ids.push(loan.book_id);
          group.book_copy_ids.push(loan.book_copy_id);
          group.book_barcodes.push(loan.book_barcode);
          group.total_books += 1;
          
          // For multiple books, use a combined title
          group.book_title = `${group.total_books} books: ${group.book_titles.slice(0, 2).join(", ")}${group.total_books > 2 ? "..." : ""}`;
        }
      }
      
      // Add all transaction groups to the results
      for (const transactionId in loanGroups) {
        groupedLoans.push(loanGroups[transactionId]);
      }
      
      return groupedLoans;
    });
};

const getOverdueLoans = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today

  const database = await getDb();
  return database("loans")
    .join("book_copies", "loans.book_copy_id", "book_copies.id")
    .join("books", "book_copies.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .whereNull("loans.return_date")
    .andWhere(function() {
      this.where("loans.status", "Overdue")
          .orWhere(function() {
            this.where("loans.due_date", "<", today)
                .andWhere("loans.status", "!=", "Returned");
          });
    })
    .select(
      "loans.*",
      "book_copies.barcode as book_barcode",
      "book_copies.location_code as book_location_code",
      "book_copies.status as book_status",
      "book_copies.condition as book_condition",
      "book_copies.acquisition_date as book_acquisition_date",
      "books.id as book_id",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.author as book_author",
      "books.cover_color as book_color",
      "books.front_cover as book_cover",
      "members.name as member_name",
      "members.email as member_email"
    )
    .then(async (loans) => {
      console.log(`DB: Found ${loans.length} overdue loans`);
      
      // Group loans by transaction_id if available
      const groupedLoans = [];
      const loanGroups = {};
      
      for (const loan of loans) {
        // If no transaction_id or is a single book transaction, handle normally
        if (!loan.transaction_id) {
          groupedLoans.push(loan);
          continue;
        }
        
        // Group loans with the same transaction_id
        if (!loanGroups[loan.transaction_id]) {
          loanGroups[loan.transaction_id] = {
            ...loan,
            is_batch: true,
            book_titles: [loan.book_title],
            book_ids: [loan.book_id],
            book_copy_ids: [loan.book_copy_id],
            book_barcodes: [loan.book_barcode],
            total_books: 1
          };
        } else {
          // Add this book's info to the existing group
          const group = loanGroups[loan.transaction_id];
          group.book_titles.push(loan.book_title);
          group.book_ids.push(loan.book_id);
          group.book_copy_ids.push(loan.book_copy_id);
          group.book_barcodes.push(loan.book_barcode);
          group.total_books += 1;
          
          // For multiple books, use a combined title
          group.book_title = `${group.total_books} books: ${group.book_titles.slice(0, 2).join(", ")}${group.total_books > 2 ? "..." : ""}`;
        }
      }
      
      // Add all transaction groups to the results
      for (const transactionId in loanGroups) {
        groupedLoans.push(loanGroups[transactionId]);
      }
      
      return groupedLoans;
    });
};

const addLoan = (loan) => db("loans").insert(loan).returning("*");
const updateLoan = (id, loan) =>
  db("loans").where({ id }).update(loan).returning("*");
const returnBook = (id, reviewData = {}) => {
  console.log(
    `Returning book with loan ID: ${id}`,
    reviewData ? "With review data" : "No review data"
  );

  return db.transaction(async (trx) => {
    // Get the loan
    const loan = await trx("loans").where({ id }).first();

    if (!loan) {
      throw new Error("Loan not found");
    }

    // Update loan status and return date
    const updateData = {
      status: "Returned",
      return_date: new Date(),
      updated_at: new Date(),
    };

    // Add rating and review if provided
    if (reviewData && reviewData.rating) {
      updateData.rating = reviewData.rating;
    }

    if (reviewData && reviewData.review) {
      updateData.review = reviewData.review;
    }

    console.log(`Updating loan ${id} with data:`, updateData);

    await trx("loans").where({ id }).update(updateData);

    // Update book status
    await trx("book_copies").where({ id: loan.book_copy_id }).update({
      status: "Available",
      updated_at: new Date(),
    });

    return { success: true };
  });
};

const borrowBooks = (memberData) => {
  return db.transaction(async (trx) => {
    const { member_id, book_copy_id, book_copies, checkout_date, due_date } =
      memberData;

    // Validate member
    const member = await trx("members").where({ id: member_id }).first();
    if (!member) {
      throw new Error("Member not found");
    }

    if (member.status !== "Active") {
      throw new Error("Member is not active");
    }

    // Handle single book_copy_id or multiple book_copies
    let bookCopiesArray = [];
    
    // Handle different ways book copies might be provided
    if (book_copies) {
      // If book_copies is provided, it can be an array or a single value
      if (Array.isArray(book_copies)) {
        bookCopiesArray = book_copies;
      } else if (typeof book_copies === 'string') {
        // It could be a comma-separated list or a single value
        bookCopiesArray = book_copies.includes(',') 
          ? book_copies.split(',').map(id => id.trim()) 
          : [book_copies];
      } else {
        // Handle case where it might be a number
        bookCopiesArray = [book_copies.toString()];
      }
    } else if (book_copy_id) {
      // Handle book_copy_id similarly
      if (Array.isArray(book_copy_id)) {
        bookCopiesArray = book_copy_id;
      } else if (typeof book_copy_id === 'string') {
        bookCopiesArray = book_copy_id.includes(',') 
          ? book_copy_id.split(',').map(id => id.trim()) 
          : [book_copy_id];
      } else {
        bookCopiesArray = [book_copy_id.toString()];
      }
    }

    if (bookCopiesArray.length === 0) {
      throw new Error("No book copy IDs provided");
    }

    console.log(`Borrowing book copies: ${bookCopiesArray.join(", ")}`);

    // First, validate that all book copies exist
    const existingBookCopies = await trx("book_copies")
      .whereIn("id", bookCopiesArray)
      .select("id", "barcode", "status");
    
    // Check for non-existent book copies
    if (existingBookCopies.length !== bookCopiesArray.length) {
      // Find which IDs don't exist
      const existingIds = existingBookCopies.map(copy => copy.id.toString());
      const missingIds = bookCopiesArray.filter(id => !existingIds.includes(id.toString()));
      
      throw new Error(`Some book copies do not exist: ${missingIds.join(", ")}`);
    }

    // Now check if any of the copies are already checked out or otherwise unavailable
    const unavailableBooks = existingBookCopies.filter(copy => copy.status !== "Available");

    if (unavailableBooks.length > 0) {
      // Get detailed information about unavailable books
      const unavailableDetails = await trx("book_copies")
        .join("books", "book_copies.book_id", "books.id")
        .leftJoin("loans", function() {
          this.on("book_copies.id", "=", "loans.book_copy_id")
              .andOnVal("loans.status", "!=", "Returned");
        })
        .leftJoin("members", "loans.member_id", "members.id")
        .whereIn("book_copies.id", unavailableBooks.map(b => b.id))
        .select(
          "book_copies.id",
          "book_copies.barcode",
          "book_copies.status",
          "books.title",
          "loans.due_date",
          "members.name as borrowed_by"
        );
      
      // Prepare a detailed error message
      const detailedMessages = unavailableDetails.map(book => {
        let message = `${book.title} (${book.barcode}) - Status: ${book.status}`;
        if (book.status === "Checked Out" && book.borrowed_by) {
          const dueDate = new Date(book.due_date).toLocaleDateString();
          message += `, borrowed by ${book.borrowed_by}, due on ${dueDate}`;
        }
        return message;
      });
      
      throw new Error(
        `The following books are not available:\n${detailedMessages.join("\n")}`
      );
    }

    // Get book details for each copy for logging purposes
    const bookCopiesDetails = await trx("book_copies")
      .join("books", "book_copies.book_id", "books.id")
      .whereIn("book_copies.id", bookCopiesArray)
      .select(
        "book_copies.id",
        "book_copies.barcode",
        "books.id as book_id",
        "books.title"
      );

    console.log(
      "Book copies to borrow:",
      bookCopiesDetails.map((b) => `${b.title} (${b.barcode})`).join(", ")
    );

    // Generate a transaction ID for this group of books
    const transactionId = `LOAN-${Date.now()}-${member_id}`;

    // Create loans for each book copy
    const loans = bookCopiesArray.map((bookCopyId) => ({
      book_copy_id: bookCopyId,
      member_id,
      checkout_date: checkout_date || new Date(),
      due_date: due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default to 14 days
      status: "Borrowed",
      transaction_id: transactionId  // Add the transaction ID to group these loans
    }));

    // Insert all loans
    const insertedLoans = await trx("loans").insert(loans).returning("*");

    // Update book copy status to "Checked Out"
    await trx("book_copies").whereIn("id", bookCopiesArray).update({
      status: "Checked Out",
      updated_at: new Date(),
    });

    return insertedLoans;
  });
};

const returnBooks = (loanIdsOrData) => {
  return db.transaction(async (trx) => {
    const today = new Date();
    
    // Handle different input formats
    let loanIds = [];
    let returnDataByLoanId = {}; // For storing returnCondition and notes
    
    // Process the input data
    if (Array.isArray(loanIdsOrData)) {
      // Legacy format - just an array of loan IDs
      console.log("Processing as array of loan IDs");
      loanIds = loanIdsOrData;
    } else if (loanIdsOrData && loanIdsOrData.returns && Array.isArray(loanIdsOrData.returns)) {
      // New format - object with returns array
      console.log("Processing as object with returns array");
      
      // Extract loan IDs 
      loanIds = loanIdsOrData.returns
        .filter(item => item && (item.loan_id || item.loanId)) 
        .map(item => item.loan_id || item.loanId);
      
      // Build a lookup object for return conditions and notes
      loanIdsOrData.returns.forEach(item => {
        if (item && (item.loan_id || item.loanId)) {
          const loanId = item.loan_id || item.loanId;
          returnDataByLoanId[loanId] = {
            returnCondition: item.returnCondition || 'Good',
            note: item.note || ''
          };
        }
      });
    } else if (typeof loanIdsOrData === 'number' || 
               (typeof loanIdsOrData === 'string' && !isNaN(Number(loanIdsOrData)))) {
      // Single loan ID
      console.log("Processing as single loan ID");
      loanIds = [Number(loanIdsOrData)];
    } else {
      console.log("Unable to determine loan IDs format:", loanIdsOrData);
      throw new Error("Invalid format for loan IDs");
    }
    
    // Make sure we have valid loan IDs
    if (loanIds.length === 0) {
      throw new Error("No valid loan IDs provided");
    }

    // Get all the loans
    const loans = await trx("loans").whereIn("id", loanIds).select("*");

    if (loans.length !== loanIds.length) {
      throw new Error("Some loan IDs are invalid");
    }

    // Check if the first loan has a transaction_id and is part of a batch
    const firstLoan = loans[0];
    if (firstLoan.transaction_id) {
      console.log(`Loan ${firstLoan.id} is part of transaction ${firstLoan.transaction_id}`);
      
      // Get all loans in this transaction to return them all at once
      const batchLoans = await trx("loans")
        .where("transaction_id", firstLoan.transaction_id)
        .whereNull("return_date")
        .select("*");
        
      if (batchLoans.length > 0) {
        console.log(`Found ${batchLoans.length} loans in transaction ${firstLoan.transaction_id}`);
        
        // Update all loans in the batch to returned
        const batchLoanIds = batchLoans.map(loan => loan.id);
        
        // Process each loan in the batch
        for (const loan of batchLoans) {
          const updateData = {
          status: "Returned",
          return_date: today,
            updated_at: today
          };
          
          // Add return condition and note if available
          if (returnDataByLoanId[loan.id]) {
            updateData.return_condition = returnDataByLoanId[loan.id].returnCondition;
            updateData.return_note = returnDataByLoanId[loan.id].note;
          }
          
          await trx("loans").where("id", loan.id).update(updateData);
        }
        
        // Update all books to available
        const bookCopiesIds = batchLoans.map((loan) => loan.book_copy_id);
        await trx("book_copies").whereIn("id", bookCopiesIds).update({
          status: "Available",
          updated_at: today,
        });
        
        return { 
          success: true, 
          count: batchLoans.length,
          message: `Returned ${batchLoans.length} books in batch` 
        };
      }
    }

    // Regular case - update each loan individually to capture return conditions
    for (const loan of loans) {
      const updateData = {
      status: "Returned",
      return_date: today,
        updated_at: today
      };
      
      // Add return condition and note if available
      if (returnDataByLoanId[loan.id]) {
        updateData.return_condition = returnDataByLoanId[loan.id].returnCondition;
        updateData.return_note = returnDataByLoanId[loan.id].note;
      }
      
      await trx("loans").where("id", loan.id).update(updateData);
    }

    // Update all books to available
    const bookCopiesIds = loans.map((loan) => loan.book_copy_id);
    await trx("book_copies").whereIn("id", bookCopiesIds).update({
      status: "Available",
      updated_at: today,
    });

    return { success: true, count: loans.length };
  });
};

// Process return via QR code
const returnBooksViaQRCode = (qrData) => {
  return db.transaction(async (trx) => {
    const today = new Date();

    try {
      // Parse the QR data if it's a string
      const data = typeof qrData === "string" ? JSON.parse(qrData) : qrData;

      // Extract loan IDs from the QR code data
      const { loansIds, transactionId, memberId, skipMemberCheck } = data;

      if (!loansIds || !Array.isArray(loansIds) || loansIds.length === 0) {
        throw new Error("No valid loan IDs found in QR code");
      }

      // First, try to get the loans without any member filter
      let loans = await trx("loans").whereIn("id", loansIds).select("*");
      
      // Log what we found
      console.log(`Found ${loans.length} loans with IDs: ${loansIds.join(', ')}`);
      
      // If no loans found with these IDs, try to provide helpful information
      if (loans.length === 0) {
        // Get info about active loans for context
        const activeLoansCount = await trx("loans")
          .whereNull("return_date")
          .count("* as count")
          .first();
          
        console.log(`Total active loans in system: ${activeLoansCount.count}`);
        
        // If member ID is provided, check if they have any active loans
        if (memberId) {
          const memberLoans = await trx("loans")
            .where({ member_id: memberId })
            .whereNull("return_date")
            .select("id")
            .orderBy("id", "desc")
            .limit(5);
            
          if (memberLoans.length > 0) {
            const memberLoanIds = memberLoans.map(l => l.id);
            console.log(`Member ID ${memberId} has active loans with IDs: ${memberLoanIds.join(', ')}`);
            
            // Check if the loan might already be returned
            const returnedLoans = await trx("loans")
              .whereIn("id", loansIds)
              .where({ status: "Returned" })
              .select("id", "return_date")
              .orderBy("id");
              
            if (returnedLoans.length > 0) {
              throw new Error(`Loans with IDs ${returnedLoans.map(l => l.id).join(', ')} have already been returned`);
            }
            
            throw new Error(`No active loans found with IDs: ${loansIds.join(', ')}. Member has different active loans: ${memberLoanIds.join(', ')}`);
          } else {
            // Check if the member has any returned loans
            const returnedLoans = await trx("loans")
              .where({ member_id: memberId, status: "Returned" })
              .select("id")
              .orderBy("id", "desc")
              .limit(5);
              
            if (returnedLoans.length > 0) {
              throw new Error(`Member ID ${memberId} has no active loans. All loans have been returned.`);
            } else {
              throw new Error(`Member ID ${memberId} has no loans in the system.`);
            }
          }
        } else {
          // No member ID, just report on the general loan status
          const recentLoans = await trx("loans")
            .whereNull("return_date")
            .select("id", "member_id")
            .orderBy("id", "desc")
            .limit(5);
            
          if (recentLoans.length > 0) {
            const recentIds = recentLoans.map(l => l.id);
            throw new Error(`No loans found with IDs: ${loansIds.join(', ')}. Recent active loan IDs: ${recentIds.join(', ')}`);
          } else {
            throw new Error(`No loans found with IDs: ${loansIds.join(', ')}. There are currently no active loans in the system.`);
          }
        }
      }
      
      // If memberId is provided and we're not skipping the check, validate that these loans belong to the member
      if (memberId && !skipMemberCheck) {
        console.log(`Validating loans belong to member ID: ${memberId}`);
        
        // Check if any loans belong to this member
        const memberLoans = loans.filter(loan => Number(loan.member_id) === Number(memberId));
        
        if (memberLoans.length === 0) {
          console.log(`None of the loans belong to member ID: ${memberId}`);
          console.log(`Loan member IDs: ${loans.map(l => l.member_id).join(', ')}`);
          
          // Instead of failing, we'll continue but log a warning
          console.warn(`WARNING: Processing loans not associated with provided member ID: ${memberId}`);
        } else if (memberLoans.length < loans.length) {
          // Some but not all loans belong to this member
          console.warn(`WARNING: Some loans don't belong to member ID: ${memberId}, will only process ${memberLoans.length} of ${loans.length} loans`);
          loans = memberLoans;
        } else {
          console.log(`All ${loans.length} loans belong to member ID: ${memberId}`);
        }
      }

      // Check if any loans are already returned
      const alreadyReturned = loans.filter(
        (loan) => loan.status === "Returned"
      );
      if (alreadyReturned.length > 0) {
        console.log(`${alreadyReturned.length} books already returned`);
        
        // If ALL loans are already returned, send a success message
        if (alreadyReturned.length === loans.length) {
          return {
            success: true,
            message: `All ${loans.length} books have already been returned`,
            count: 0,
            transactionId,
            alreadyReturned: true
          };
        }
      }

      // Get only unreturned loans
      const activeLoans = loans.filter((loan) => loan.status !== "Returned");

      if (activeLoans.length === 0) {
        return {
          success: true,
          message: "All books already returned",
          count: 0,
          transactionId,
          alreadyReturned: true
        };
      }

      // Update all active loans to returned
      const activeLoansIds = activeLoans.map((loan) => loan.id);
      await trx("loans").whereIn("id", activeLoansIds).update({
        status: "Returned",
        return_date: today,
        updated_at: today,
      });

      // Update all books to available
      const bookCopiesIds = activeLoans.map((loan) => loan.book_copy_id);
      await trx("book_copies").whereIn("id", bookCopiesIds).update({
        status: "Available",
        updated_at: today,
      });

      return {
        success: true,
        message: `${activeLoans.length} books returned successfully`,
        count: activeLoans.length,
        transactionId,
      };
    } catch (error) {
      console.error("Error in returnBooksViaQRCode:", error);
      throw new Error(`Failed to process QR code return: ${error.message}`);
    }
  });
};

// User management functions
const getAllUsers = () =>
  db("users").select(
    "id", "username", "role", "status", "pin_code", "qr_auth_key", "created_at", "updated_at"
  );
const getUserById = (id) => db("users").where({ id }).first();
const addUser = (user) => db("users").insert(user).returning("*");
const updateUser = (id, user) => db("users").where({ id }).update(user).returning("*");
const deleteUser = (id) => db("users").where({ id }).del();

// PIN and QR authentication
const authenticateWithPin = async (pin_input) => {
  try {
    const database = await getDb();
    
    // Extract PIN code
    const pin_code = typeof pin_input === "object" && pin_input.pin_code
      ? pin_input.pin_code
      : pin_input;

    if (!pin_code) {
      return { success: false, message: "PIN code is required" };
    }

    // First check users table
    const user = await database("users").where({ pin_code }).first();
    let memberData = null;
    let userObject = null;

    if (user) {
      userObject = user;

      if (user.status !== "active") {
        return { success: false, message: "User account is inactive" };
      }

      // Get associated member data if user is a member
      const hasMemberIdColumn = await database.schema.hasColumn("users", "member_id");
      if (hasMemberIdColumn && user.member_id) {
        memberData = await database("members").where({ id: user.member_id }).first();
      }
    } else {
      // Check in members table for matching PIN
      const member = await database("members").where({ pin: pin_code }).first();

      if (member) {
        memberData = member;

        if (member.status !== "Active") {
          return { success: false, message: "Member account is inactive" };
        }

        // Create user object from member data
        userObject = {
          id: `member-${member.id}`,
          username: member.name,
          email: member.email,
          role: "member",
          member_id: member.id,
        };
      } else {
        return { success: false, message: "Invalid PIN code" };
      }
    }

    // Create safe user object
    const safeUser = {
      id: userObject.id,
      username: userObject.username,
      email: userObject.email || `${userObject.username}@example.com`,
      role: userObject.role,
      member_id: userObject.member_id || (memberData ? memberData.id : null),
      member: memberData,
    };

    return {
      success: true,
      user: safeUser,
    };
  } catch (error) {
    console.error("PIN authentication error:", error);
    return {
      success: false,
      message: "PIN authentication failed due to a system error",
      error: error.message,
    };
  }
};

const authenticateWithQR = async (qr_auth_key, pin_code) => {
  try {
    // First check in users table
    const user = await db("users").where({ qr_auth_key }).first();
    let memberData = null;
    let userObject = null;

    if (user) {
      userObject = user;

      // If PIN code is provided, verify it
      if (pin_code && user.pin_code !== pin_code) {
        return { success: false, message: "Invalid PIN code" };
      }

      if (user.status !== "active") {
        return { success: false, message: "User account is inactive" };
      }

      // Get associated member data if user is a member
      const hasMemberIdColumn = await db.schema.hasColumn("users", "member_id");
      if (hasMemberIdColumn && user.member_id) {
        memberData = await db("members").where({ id: user.member_id }).first();
      }
    } else {
      // Check in members table for matching QR code
      const member = await db("members")
        .where({ qr_code: qr_auth_key })
        .first();

      if (member) {
        memberData = member;

        // If PIN code is provided, verify it against member PIN
        if (pin_code && member.pin !== pin_code) {
          return { success: false, message: "Invalid PIN code" };
        }

        if (member.status !== "Active") {
          return { success: false, message: "Member account is inactive" };
        }

        // Create user object from member data
        userObject = {
          id: `member-${member.id}`,
          username: member.name,
          email: member.email,
          role: "member",
          member_id: member.id,
        };
      } else {
        return { success: false, message: "Invalid QR code" };
      }
    }

    // Create safe user object
    const safeUser = {
      id: userObject.id,
      username: userObject.username,
      email: userObject.email || `${userObject.username}@example.com`,
      role: userObject.role,
      member_id: userObject.member_id || (memberData ? memberData.id : null),
      member: memberData,
    };

    return {
      success: true,
      user: safeUser,
    };
  } catch (error) {
    console.error("QR authentication error:", error);
    return {
      success: false,
      message: "QR authentication failed due to a system error",
      error: error.message,
    };
  }
};

// Shelves Management Functions
const getAllShelves = () => db("shelves").select("*");

const getShelfById = (id) => {
  console.log(`Looking up shelf with ID: ${id}`);
  return db("shelves")
    .where({ id })
    .first()
    .then((shelf) => {
      if (!shelf) {
        console.log(`No shelf found with ID ${id}`);
      } else {
        console.log(`Found shelf: ${shelf.name}`);
      }
      return shelf;
    });
};

const addShelf = async (shelf) => {
  console.log('Adding shelf with data:', JSON.stringify(shelf));
  
  try {
    // First check if we have a code field to use
    if (!shelf.code && !shelf.shelf_code) {
      // Generate a default shelf code if not provided
      // Format: first 3 chars of location + first 3 chars of name + random 3-digit number
      const locationPrefix = (shelf.location || '').substring(0, 3).toUpperCase();
      const namePrefix = (shelf.name || '').substring(0, 3).toUpperCase();
      const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
      shelf.code = `${locationPrefix}${namePrefix}${randomNum}`;
      console.log('Generated default code:', shelf.code);
    }
    
    // Map shelf_code to code if needed
    if (shelf.shelf_code !== undefined && shelf.code === undefined) {
      shelf.code = shelf.shelf_code;
      delete shelf.shelf_code;
    }
    
    // Check table schema to see if we have shelf_code column
    try {
      const hasShelfCodeColumn = await db.schema.hasColumn('shelves', 'shelf_code');
      console.log('Has shelf_code column:', hasShelfCodeColumn);
      
      if (hasShelfCodeColumn) {
        // If table has shelf_code column, make sure we use it
        if (shelf.code !== undefined) {
          shelf.shelf_code = shelf.code;
          delete shelf.code;
        }
      }
    } catch (schemaError) {
      console.error('Error checking schema:', schemaError);
      // Fallback - try both ways
      if (shelf.code !== undefined) {
        shelf.shelf_code = shelf.code;
      }
    }
    
    console.log('Final shelf data for insertion:', JSON.stringify(shelf));
    return await db("shelves").insert(shelf).returning("*");
  } catch (error) {
    console.error('Error adding shelf:', error);
    throw error;
  }
};

const updateShelf = async (id, shelf) => {
  console.log(`Updating shelf ID ${id} with data:`, typeof shelf, JSON.stringify(shelf));
  
  try {
    // Handle potential complex input formats
    let shelfData;
    
    // Ensure shelf is not undefined
    if (!shelf) {
      throw new Error('No shelf data provided for update');
    }
    
    // Handle case where shelf might be another object containing a shelf property
    if (typeof shelf === 'object' && shelf.shelf && typeof shelf.shelf === 'object') {
      console.log('Detected nested shelf object structure, extracting inner shelf');
      shelfData = { ...shelf.shelf };
    } else {
      // Normal case - regular shelf object
      shelfData = { ...shelf };
    }
    
    console.log('Using shelf data:', JSON.stringify(shelfData));
    
    // Map shelf_code to code if needed
    if (shelfData.shelf_code !== undefined && shelfData.code === undefined) {
      shelfData.code = shelfData.shelf_code;
      delete shelfData.shelf_code;
    }
    
    // Check table schema to see if we have shelf_code column
    try {
      const hasShelfCodeColumn = await db.schema.hasColumn('shelves', 'shelf_code');
      console.log('Has shelf_code column:', hasShelfCodeColumn);
      
      if (hasShelfCodeColumn) {
        // If table has shelf_code column, make sure we use it
        if (shelfData.code !== undefined) {
          shelfData.shelf_code = shelfData.code;
          delete shelfData.code;
        }
      }
    } catch (schemaError) {
      console.error('Error checking schema:', schemaError);
      // Fallback - try both ways if we have a code value
      if (shelfData.code !== undefined) {
        shelfData.shelf_code = shelfData.code;
      }
    }
    
    console.log('Final shelf update data:', JSON.stringify(shelfData));
    
    // Verify we have data to update
    if (Object.keys(shelfData).length === 0) {
      throw new Error('No valid data provided for shelf update');
    }
    
    // Perform the update
    return await db("shelves").where({ id }).update(shelfData).returning("*");
  } catch (error) {
    console.error(`Error updating shelf ${id}:`, error);
    throw error;
  }
};

const deleteShelf = (id) => db("shelves").where({ id }).del();

const getShelfContents = (shelfId) => {
  return db("book_copies")
    .join("books", "book_copies.book_id", "books.id")
    .where("book_copies.shelf_id", shelfId)
    .select(
      "book_copies.*",
      "books.title",
      "books.author",
      "books.isbn",
      "books.category",
      "books.front_cover",
      "books.cover_color"
    );
};

// Book Copies Management Functions
const getAllBookCopies = () => {
  return db("book_copies")
    .join("books", "book_copies.book_id", "books.id")
    .leftJoin("shelves", "book_copies.shelf_id", "shelves.id")
    .select(
      "book_copies.*",
      "books.title",
      "books.author",
      "books.isbn",
      "books.category",
      "shelves.name as shelf_name",
      "shelves.location as shelf_location"
    );
};

const getBookCopyById = (id) => {
  console.log(`Looking up book copy with ID: ${id}`);
  return db("book_copies")
    .join("books", "book_copies.book_id", "books.id")
    .leftJoin("shelves", "book_copies.shelf_id", "shelves.id")
    .where("book_copies.id", id)
    .select(
      "book_copies.*",
      "books.title",
      "books.author",
      "books.isbn",
      "books.category",
      "shelves.name as shelf_name",
      "shelves.location as shelf_location"
    )
    .first()
    .then((bookCopy) => {
      if (!bookCopy) {
        console.log(`No book copy found with ID ${id}`);
      } else {
        console.log(`Found book copy: ${bookCopy.title} (${bookCopy.barcode})`);
      }
      return bookCopy;
    });
};

const getBookCopiesByBookId = (bookId) => {
  console.log(`Looking up copies for book with ID: ${bookId}`);
  return db("book_copies")
    .join("books", "book_copies.book_id", "books.id")
    .leftJoin("shelves", "book_copies.shelf_id", "shelves.id")
    .where("book_copies.book_id", bookId)
    .select(
      "book_copies.*",
      "books.title",
      "books.author",
      "books.isbn",
      "books.category",
      "shelves.name as shelf_name",
      "shelves.location as shelf_location"
    )
    .then((bookCopies) => {
      console.log(`Found ${bookCopies.length} copies for book ID ${bookId}`);
      return bookCopies;
    });
};

const addBookCopy = (bookCopy) =>
  db("book_copies").insert(bookCopy).returning("*");

const updateBookCopy = (id, bookCopy) =>
  db("book_copies").where({ id }).update(bookCopy).returning("*");

const deleteBookCopy = (id) => db("book_copies").where({ id }).del();

const moveBookCopy = (id, shelfId) => {
  return db.transaction(async (trx) => {
    const bookCopy = await trx("book_copies").where({ id }).first();

    if (!bookCopy) {
      throw new Error(`Book copy with ID ${id} not found`);
    }

    const shelf = await trx("shelves").where({ id: shelfId }).first();

    if (!shelf) {
      throw new Error(`Shelf with ID ${shelfId} not found`);
    }

    // Get the book information to update the location code
    const book = await trx("books").where({ id: bookCopy.book_id }).first();

    // Create a new location code based on the shelf section
    const copyNumber = bookCopy.barcode.split("-C")[1];
    const locationCode = `${shelf.section
      .substring(0, 3)
      .toUpperCase()}-${book.id.toString().padStart(3, "0")}-${copyNumber}`;

    // Update the book copy with the new shelf ID and location code
    await trx("book_copies").where({ id }).update({
      shelf_id: shelfId,
      location_code: locationCode,
      updated_at: new Date(),
    });

    return { success: true, message: `Book copy moved to ${shelf.name}` };
  });
};

// Function to get book availability summary
const getBookAvailability = (bookId) => {
  return db.transaction(async (trx) => {
    // Get the book
    const book = await trx("books").where({ id: bookId }).first();

    if (!book) {
      throw new Error(`Book with ID ${bookId} not found`);
    }

    // Get all copies of the book
    const copies = await trx("book_copies")
      .where({ book_id: bookId })
      .select(
        "id",
        "barcode",
        "status",
        "location_code",
        "shelf_id",
        "condition"
      );

    // Count copies by status
    const totalCopies = copies.length;
    const availableCopies = copies.filter(
      (copy) => copy.status === "Available"
    ).length;
    const checkedOutCopies = copies.filter(
      (copy) => copy.status === "Checked Out"
    ).length;
    const damagedCopies = copies.filter(
      (copy) => copy.condition === "Poor"
    ).length;

    // Get shelf information for available copies
    const availableCopiesDetails = await Promise.all(
      copies
        .filter((copy) => copy.status === "Available")
        .map(async (copy) => {
          if (copy.shelf_id) {
            const shelf = await trx("shelves")
              .where({ id: copy.shelf_id })
              .first();
            return {
              id: copy.id,
              barcode: copy.barcode,
              location_code: copy.location_code,
              condition: copy.condition,
              shelf: shelf
                ? {
                    id: shelf.id,
                    name: shelf.name,
                    location: shelf.location,
                  }
                : null,
            };
          } else {
            return {
              id: copy.id,
              barcode: copy.barcode,
              location_code: copy.location_code,
              condition: copy.condition,
              shelf: null,
            };
          }
        })
    );

    return {
      book_id: bookId,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      total_copies: totalCopies,
      available_copies: availableCopies,
      checked_out_copies: checkedOutCopies,
      damaged_copies: damagedCopies,
      available_copies_details: availableCopiesDetails,
    };
  });
};

// Function to reset the database (clear all data)
const resetDatabase = async () => {
  try {
    console.log("Resetting database...");
    
    // Close the current database connection
    if (db) {
      await db.destroy();
      db = null;
    }
    
    const dbFilePath = getDatabasePath();
    const templateDbPath = getTemplateDatabasePath();
    
    // Check if template database exists
    if (!fs.existsSync(templateDbPath)) {
      throw new Error(`Template database not found at ${templateDbPath}`);
    }
    
    // Remove existing database if it exists
    if (fs.existsSync(dbFilePath)) {
      fs.unlinkSync(dbFilePath);
      console.log("Existing database removed");
    }
    
    // Copy fresh template database
    fs.copyFileSync(templateDbPath, dbFilePath);
    console.log(`Fresh database copied from template at ${templateDbPath}`);
    
    // Re-initialize the database
    await initDb();
    console.log("Database has been reset with fresh template");
    
    return { success: true, message: "Database reset successfully" };
  } catch (error) {
    console.error("Error resetting database:", error);
    return {
      success: false,
      message: `Database reset failed: ${error.message}`,
    };
  }
};

// Function to clear all loans from the database
const clearLoans = async () => {
  try {
    console.log("Clearing all loans from the database...");
    
    // Get database instance
    const database = await getDb();
    
    const deletedCount = await database("loans").del();
    console.log(`Cleared ${deletedCount} loans from database`);

    // Reset all book copies that were checked out to Available
    const updatedCopies = await database("book_copies")
      .where({ status: "Checked Out" })
      .update({
        status: "Available",
        updated_at: new Date(),
      });

    console.log(`Reset ${updatedCopies} book copies to Available status`);

    return {
      success: true,
      message: `Cleared ${deletedCount} loans and reset ${updatedCopies} book copies`,
    };
  } catch (error) {
    console.error("Error clearing loans:", error);
    return { success: false, error: error.message };
  }
};

const repairDatabase = async () => {
  try {
    console.log("Repairing database...");
    
    // Get database instance
    const database = await getDb();
    
    return database.transaction(async (trx) => {
      try {
        // Get all loans that need book IDs
        const loansToRepair = await trx("loans")
          .join("book_copies", "loans.book_copy_id", "book_copies.id")
          .select("loans.id as loan_id", "book_copies.book_id as book_id");

        // Update each loan to include book details
        const updatedLoans = [];
        for (const loan of loansToRepair) {
          try {
            // Get book details
            const book = await trx("books").where({ id: loan.book_id }).first();

            if (book) {
              // Add book_id and book_title to loan record for faster access
              await trx("loans").where({ id: loan.loan_id }).update({
                book_id: book.id,
                book_title: book.title,
                book_isbn: book.isbn,
              });

              updatedLoans.push(loan.loan_id);
            }
          } catch (error) {
            console.error(`Error updating loan ${loan.loan_id}:`, error);
          }
        }

        return {
          success: true,
          message: `Updated ${updatedLoans.length} loans with book details`,
          updatedLoans,
        };
      } catch (error) {
        console.error("Error in repairDatabase:", error);
        throw error;
      }
    });
  } catch (error) {
    console.error("Error repairing database:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Get dashboard statistics including total books, members, checked out books, and overdue returns
 */
const getDashboardStats = async () => {
  try {
    // Get total books count
    const [{ count: totalBooks }] = await db("books").count("* as count");

    // Get active members count
    const [{ count: activeMembers }] = await db("members")
      .where({ status: "Active" })
      .count("* as count");

    // Get checked out books count
    const [{ count: booksCheckedOut }] = await db("book_copies")
      .where({ status: "Checked Out" })
      .count("* as count");

    // Get overdue books count
    const today = new Date();
    const overdueLoans = await db("loans")
      .where({ status: "Active" })
      .where("due_date", "<", today)
      .count("* as count");

    const pendingReturns = overdueLoans[0].count;

    // Get total shelves count
    const [{ count: totalShelves }] = await db("shelves").count("* as count");

    // Get total loans count
    const [{ count: totalLoans }] = await db("loans").count("* as count");

    // Calculate return rate (percentage of loans that were returned)
    const [{ count: returnedLoans }] = await db("loans")
      .where({ status: "Returned" })
      .count("* as count");
    
    // Calculate return rate only if there are loans
    const returnRate = totalLoans > 0 
      ? Math.floor((returnedLoans / totalLoans) * 100) 
      : 0;

    // Calculate overdue rate (percentage of active loans that are overdue)
    const [{ count: activeLoans }] = await db("loans")
      .where({ status: "Active" })
      .orWhere({ status: "Borrowed" })
      .orWhere({ status: "Checked Out" })
      .count("* as count");
    
    const overdueRate = activeLoans > 0 
      ? Math.floor((parseInt(pendingReturns) / activeLoans) * 100) 
      : 0;

    return {
      success: true,
      data: {
        totalBooks,
        activeMembers,
        booksCheckedOut,
        pendingReturns,
        totalShelves,
        totalLoans,
        returnRate,
        overdueRate
      },
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get most popular books based on checkout frequency
 */
const getMostPopularBooks = async (limit = 5) => {
  try {
    const popularBooks = await db("loans")
      .join("books", "loans.book_id", "books.id")
      .select("books.id", "books.title", "books.author")
      .count("loans.id as borrow_count")
      .groupBy("books.id", "books.title", "books.author")
      .orderBy("borrow_count", "desc")
      .limit(limit);

    return {
      success: true,
      data: popularBooks,
    };
  } catch (error) {
    console.error("Error getting popular books:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get popular book categories based on total checkouts
 */
const getPopularCategories = async (limit = 5) => {
  try {
    const popularCategories = await db("loans")
      .join("books", "loans.book_id", "books.id")
      .select("books.category")
      .count("loans.id as count")
      .whereNotNull("books.category")
      .groupBy("books.category")
      .orderBy("count", "desc")
      .limit(limit);

    return {
      success: true,
      data: popularCategories.map((category) => ({
        category: category.category || "Uncategorized",
        count: parseInt(category.count),
      })),
    };
  } catch (error) {
    console.error("Error getting popular categories:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get monthly checkouts data for the current year
 */
const getMonthlyCheckouts = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    // SQLite uses strftime for date formatting
    const results = await db("loans")
      .select(db.raw("strftime('%m', checkout_date) as month"))
      .count("* as count")
      .whereRaw(`strftime('%Y', checkout_date) = ?`, [currentYear.toString()])
      .groupBy("month")
      .orderBy("month");

    // Convert to the format needed for charts
    const monthlyData = months.map((monthName, index) => {
      // Convert to two-digit month with leading zero
      const monthNumber = (index + 1).toString().padStart(2, '0');
      const monthData = results.find((r) => r.month === monthNumber);
      return {
        month: monthName,
        count: monthData ? parseInt(monthData.count) : 0,
      };
    });

    return {
      success: true,
      data: monthlyData,
    };
  } catch (error) {
    console.error("Error getting monthly checkouts:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Check database health and repair if needed
 */
const checkDatabaseHealth = async (db) => {
  try {
    console.log("Checking database health...");
    
    // Check if tables exist
    const [
      hasBooks, 
      hasShelves, 
      hasBookCopies, 
      hasMembers, 
      hasLoans, 
      hasUsers
    ] = await Promise.all([
      db.schema.hasTable("books"),
      db.schema.hasTable("shelves"),
      db.schema.hasTable("book_copies"),
      db.schema.hasTable("members"),
      db.schema.hasTable("loans"),
      db.schema.hasTable("users")
    ]);
    
    // If any table is missing, the database is corrupted
    if (!hasBooks || !hasShelves || !hasBookCopies || !hasMembers || !hasLoans || !hasUsers) {
      console.log("Database incomplete, tables are missing");
      return { 
        success: false, 
        message: "Database is missing required tables. Consider resetting the database." 
      };
    }
    
    // Check if admin user exists
    const adminUser = await db("users").where({ username: "admin" }).first();
    if (!adminUser) {
      console.log("Admin user not found, creating...");
      await db("users").insert({
        username: "admin",
        email: "admin@balanghay.com",
        password: "admin",
        role: "admin",
        status: "active",
        pin_code: "123456",
        qr_auth_key: "ADMIN-" + Date.now()
      });
      console.log("Admin user created successfully");
    }
    
    return { success: true, message: "Database health check passed" };
  } catch (error) {
    console.error("Database health check error:", error);
    return { 
      success: false, 
      message: "Database health check failed", 
      error: error.message 
    };
  }
};

// Function to get database version information
const getDatabaseVersion = async () => {
  try {
    const database = await getDb();
    
    // Check if we have a settings table
    const hasSettingsTable = await database.schema.hasTable("settings");
    if (hasSettingsTable) {
      // Try to get version from settings
      const versionSetting = await database("settings")
        .where({ key: "database_version" })
        .first();
      
      if (versionSetting) {
        return versionSetting.value;
      }
    }
    
    // If no version in settings, try to determine from schema
    const tables = await database.raw("SELECT name FROM sqlite_master WHERE type='table';");
    const tableNames = tables.map(t => t.name).join(", ");
    
    return `Unknown version (tables: ${tableNames})`;
  } catch (error) {
    console.error("Error getting database version:", error);
    return "Error: " + error.message;
  }
};

// Table update functions (must be kept to avoid breaking existing code, but their implementation is removed)
const updateMembersTable = async () => {
  return { success: true, message: "Migration functions disabled" };
};

const updateBooksTable = async () => {
  return { success: true, message: "Migration functions disabled" };
};

const updateLoansTable = async () => {
  try {
    // Check if table exists, if not, create it
    const hasTable = await db.schema.hasTable("loans");
    if (!hasTable) {
      console.log("Creating loans table...");
      await db.schema.createTable("loans", (table) => {
        table.increments("id").primary();
        table.integer("member_id").notNullable();
        table.integer("book_id").notNullable();
        table.date("checkout_date").notNullable();
        table.date("due_date").notNullable();
        table.date("return_date").nullable();
        table.string("status").defaultTo("Checked Out");
        table.timestamps(true, true);
      });
      console.log("Loans table created");
    }

    // Now check for the book_copy_id column
    const hasBookCopyId = await db.schema
      .hasColumn("loans", "book_copy_id")
      .then((exists) => exists);

    if (!hasBookCopyId) {
      console.log("Adding book_copy_id column to loans table");
      await db.schema.table("loans", (table) => {
        table.integer("book_copy_id").nullable();
      });
      console.log("Added book_copy_id column to loans table");
    }

    // Check for transaction_id column
    const hasTransactionId = await db.schema
      .hasColumn("loans", "transaction_id")
      .then((exists) => exists);

    if (!hasTransactionId) {
      console.log("Adding transaction_id column to loans table");
      await db.schema.table("loans", (table) => {
        table.string("transaction_id").nullable();
      });
      console.log("Added transaction_id column to loans table");
    }

    // Check for return_condition column
    const hasReturnCondition = await db.schema
      .hasColumn("loans", "return_condition")
      .then((exists) => exists);

    if (!hasReturnCondition) {
      console.log("Adding return_condition column to loans table");
      await db.schema.table("loans", (table) => {
        table.string("return_condition").nullable();
      });
      console.log("Added return_condition column to loans table");
    }

    // Check for return_note column
    const hasReturnNote = await db.schema
      .hasColumn("loans", "return_note")
      .then((exists) => exists);

    if (!hasReturnNote) {
      console.log("Adding return_note column to loans table");
      await db.schema.table("loans", (table) => {
        table.text("return_note").nullable();
      });
      console.log("Added return_note column to loans table");
    }

    // Return confirmation
    return {
      success: true,
      message: "Loans table has been updated with all necessary columns",
    };
  } catch (error) {
    console.error("Error updating loans table:", error);
    return {
      success: false,
      message: `Error updating loans table: ${error.message}`,
    };
  }
};

const updateBookCopiesTable = async () => {
  return { success: true, message: "Migration functions disabled" };
};

const updateShelvesTable = async () => {
  return { success: true, message: "Migration functions disabled" };
};

// Authentication function
const authenticate = async (identifier, password) => {
  try {
    // Get database instance first to ensure it's initialized
    const database = await getDb();
    
    console.log(`Authenticating user with identifier: ${identifier}`);
    
    if (!identifier || !password) {
      console.log("Authentication failed: Missing credentials");
      return { 
        success: false, 
        message: "Both identifier and password are required" 
      };
    }

    // Special case for admin/admin - fallback when database might be inaccessible
    if (identifier === 'admin' && password === 'admin') {
      console.log("Default admin credentials detected, checking if admin exists");
      
      try {
        // First check if admin already exists
        let adminUser = await database("users").where({ username: 'admin' }).first();
        
        // If admin doesn't exist, try to create it
        if (!adminUser) {
          console.log("Admin user not found, attempting to create default admin account");
          try {
            // Create admin with hashed password
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
            console.log("Default admin user created successfully");
            adminUser = await database("users").where({ username: 'admin' }).first();
          } catch (createError) {
            console.error("Failed to create admin user:", createError);
          }
        }
        
        // Create safe user object without sensitive data
        const safeUser = {
          id: adminUser ? adminUser.id : 0,
          username: 'admin',
          email: 'admin@balanghay.com',
          role: 'admin',
        };

        console.log(`Default admin authentication successful`);
        return {
          success: true,
          user: safeUser,
        };
      } catch (error) {
        // If anything fails, still allow admin login with hardcoded user
        console.error("Error during admin fallback auth:", error);
        
        return {
          success: true,
          user: {
            id: 0,
            username: 'admin',
            email: 'admin@balanghay.com',
            role: 'admin',
          },
        };
      }
    }

    // First try to find user by username
    let user = await database("users").where({ username: identifier }).first();
    
    // If not found by username, try email
    if (!user) {
      const hasEmailColumn = await database.schema.hasColumn("users", "email");
      
      if (hasEmailColumn) {
        user = await database("users").where({ email: identifier }).first();
      }
    }

    // If user not found in users table, try to find in members table
    if (!user) {
      // Look for a member with matching email
      const member = await database("members").where({ email: identifier }).first();

      if (member) {
        // Check pin/password against members table (pin field)
        if (member.pin !== password) {
          return { success: false, message: "Invalid PIN" };
        }

        // Create a user object from member data for authentication
        user = {
          id: `member-${member.id}`,
          username: member.name,
          email: member.email,
          role: "member",
          status: member.status === "Active" ? "active" : "inactive",
          member_id: member.id,
        };
      } else {
        return { success: false, message: "User not found" };
      }
    }

    // Password check - try bcrypt first, fallback to plain text for backward compatibility
    let passwordMatches = false;
    
    try {
      // Try to compare with bcrypt
      passwordMatches = await bcrypt.compare(password, user.password);
      
      if (!passwordMatches) {
        // For backwards compatibility, check if passwords match directly
        passwordMatches = user.password === password;
      }
    } catch (bcryptError) {
      // Fallback to direct comparison if bcrypt failed
      passwordMatches = user.password === password;
    }
    
    if (!passwordMatches) {
      return { success: false, message: "Invalid password" };
    }

    if (user.status !== "active" && user.status !== "Active") {
      return { success: false, message: "User account is inactive" };
    }

    // Get associated member data if user is a member
    let memberData = null;
    const hasMemberIdColumn = await database.schema.hasColumn("users", "member_id");
    if (hasMemberIdColumn && user.member_id) {
      memberData = await database("members").where({ id: user.member_id }).first();
    }

    // Create safe user object without sensitive data
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      member_id: user.member_id || null,
      member: memberData,
    };

    console.log(`Authentication successful for user: ${safeUser.username}`);
    return {
      success: true,
      user: safeUser,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    
    // Final admin/admin fallback if there was an error with database
    if (identifier === 'admin' && password === 'admin') {
      return {
        success: true,
        user: {
          id: 0,
          username: 'admin',
          email: 'admin@balanghay.com',
          role: 'admin',
        }
      };
    }
    
    return {
      success: false,
      message: "Authentication failed due to a system error",
      error: error.message,
    };
  }
};

// Add this new function to get detailed loan information
async function getLoanDetails(loanId) {
  try {
    console.log(`Fetching detailed loan information for loan ID: ${loanId}`);
    
    const database = await getDb();
    
    // First check if this is a batch loan
    const loan = await database("loans").where({ id: loanId }).first();
    
    if (!loan) {
      throw new Error(`Loan with ID ${loanId} not found`);
    }
    
    // Get all loan details including book information
    const loanWithDetails = await database("loans")
      .where("loans.id", loanId)
      .join("book_copies", "loans.book_copy_id", "book_copies.id")
      .join("books", "book_copies.book_id", "books.id")
      .join("members", "loans.member_id", "members.id")
      .select(
        "loans.*",
        "book_copies.id as book_copy_id",
        "book_copies.barcode as book_barcode",
        "books.id as book_id",
        "books.title as book_title",
        "books.isbn as book_isbn",
        "books.author as book_author",
        "books.cover_color as book_color",
        "books.front_cover as book_cover",
        "members.id as member_id",
        "members.name as member_name",
        "members.email as member_email"
      )
      .first();
      
    if (!loanWithDetails) {
      throw new Error(`Detailed information for loan ID ${loanId} not found`);
    }
    
    // Check if this is a batch loan by looking at the transaction_id
    if (loan.transaction_id) {
      // This might be part of a batch, get all loans with the same transaction_id
      const batchLoans = await database("loans")
        .where({ transaction_id: loan.transaction_id })
        .join("book_copies", "loans.book_copy_id", "book_copies.id")
        .join("books", "book_copies.book_id", "books.id")
        .select(
          "loans.id as loan_id",
          "loans.status",
          "book_copies.id as book_copy_id",
          "book_copies.barcode as book_barcode",
          "books.id as book_id",
          "books.title as book_title",
          "books.isbn as book_isbn",
          "books.author as book_author",
          "books.cover_color as book_color",
          "books.front_cover as book_cover"
        );
        
      if (batchLoans.length > 1) {
        // This is a batch loan, add the individual loans information
        console.log(`Found batch loan with ${batchLoans.length} books`);
        
        // Add batch information to the loan
        const enhancedLoan = {
          ...loanWithDetails,
          is_batch: true,
          loan_ids: batchLoans.map(l => l.loan_id),
          book_titles: batchLoans.map(l => l.book_title),
          book_authors: batchLoans.map(l => l.book_author),
          book_isbns: batchLoans.map(l => l.book_isbn),
          book_ids: batchLoans.map(l => l.book_id),
          book_copy_ids: batchLoans.map(l => l.book_copy_id),
          book_barcodes: batchLoans.map(l => l.book_barcode),
          book_colors: batchLoans.map(l => l.book_color),
          book_covers: batchLoans.map(l => l.book_cover),
          total_books: batchLoans.length
        };
        
        return enhancedLoan;
      }
    }
    
    // This is a regular loan, return it as is
    return {
      ...loanWithDetails,
      is_batch: false,
      total_books: 1
    };
  } catch (error) {
    console.error(`Error in getLoanDetails: ${error.message}`);
    throw error;
  }
}

// Add backup/restore functions

/**
 * Backup the database to a specified path
 * @param {string} backupPath - The path to save the backup file
 * @returns {Object} Result object with success flag and message
 */
const backupDatabase = async (backupPath) => {
  try {
    const dbPath = getDatabasePath();
    
    // Ensure the database exists
    if (!fs.existsSync(dbPath)) {
      return { 
        success: false, 
        message: "Database file not found. Cannot create backup." 
      };
    }

    // Make sure the backup directory exists
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // First close any open database connections to ensure file is not locked
    try {
      await db.destroy();
      console.log("Database connection closed for backup");
    } catch (closeError) {
      console.warn("Error closing database connection:", closeError.message);
      // Continue with backup attempt
    }

    // Copy the database file
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Database backed up to ${backupPath}`);

    // Reinitialize the database connection
    db = initDatabaseConnection(dbPath);

    return { 
      success: true, 
      message: "Database backup created successfully",
      backupPath
    };
  } catch (error) {
    console.error("Error backing up database:", error);
    
    // Ensure database connection is restored even after error
    try {
      const dbPath = getDatabasePath();
      db = initDatabaseConnection(dbPath);
    } catch (reconnectError) {
      console.error("Failed to reconnect to database after backup attempt:", reconnectError);
    }
    
    return { 
      success: false, 
      message: `Failed to back up database: ${error.message}` 
    };
  }
};

/**
 * Restore the database from a specified backup path
 * @param {string} backupPath - The path to the backup file
 * @returns {Object} Result object with success flag and message
 */
const restoreDatabase = async (backupPath) => {
  try {
    // Verify backup file exists
    if (!fs.existsSync(backupPath)) {
      return { 
        success: false, 
        message: "Backup file not found." 
      };
    }

    const dbPath = getDatabasePath();
    
    // Close the current database connection
    try {
      await db.destroy();
      console.log("Database connection closed for restore");
    } catch (closeError) {
      console.warn("Error closing database connection:", closeError.message);
      // Continue with restore attempt
    }

    // Create backup of current database before replacing it
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentBackupPath = `${dbPath}.before-restore.${timestamp}`;
    
    try {
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, currentBackupPath);
        console.log(`Created backup of current database at ${currentBackupPath}`);
      }
    } catch (backupError) {
      console.warn("Failed to backup current database before restore:", backupError.message);
      // Continue with restore
    }

    // Copy the backup file to replace the current database
    fs.copyFileSync(backupPath, dbPath);
    console.log(`Database restored from ${backupPath}`);

    // Reinitialize the database connection
    db = initDatabaseConnection(dbPath);

    // Verify the restored database
    try {
      const version = await getDatabaseVersion();
      console.log("Restored database version:", version);
      
      // Ensure the admin user exists
      await ensureAdminUser(db);
      
      // Run a quick health check
      const healthCheck = await checkDatabaseHealth(db);
      if (!healthCheck.success) {
        console.warn("Database health check after restore shows issues:", healthCheck.message);
      }
    } catch (verifyError) {
      console.warn("Database verification after restore encountered issues:", verifyError.message);
    }

    return { 
      success: true, 
      message: "Database restored successfully" 
    };
  } catch (error) {
    console.error("Error restoring database:", error);
    
    // Attempt to reinitialize the database connection
    try {
      const dbPath = getDatabasePath();
      db = initDatabaseConnection(dbPath);
    } catch (reconnectError) {
      console.error("Failed to reconnect to database after restore attempt:", reconnectError);
    }
    
    return { 
      success: false, 
      message: `Failed to restore database: ${error.message}` 
    };
  }
};

module.exports = {
  db,
  initDb,
  getDb,
  getAllBooks,
  getBookById,
  addBook,
  updateBook,
  deleteBook,
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
  getAllMembers,
  getMemberById,
  addMember,
  updateMember,
  deleteMember,
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
  authenticate,
  authenticateWithPin,
  authenticateWithQR,
  getAllUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
  updateMembersTable,
  updateBooksTable,
  resetDatabase,
  updateLoansTable,
  updateBookCopiesTable,
  updateShelvesTable,
  clearLoans,
  repairDatabase,
  getDashboardStats,
  getMostPopularBooks,
  getPopularCategories,
  getMonthlyCheckouts,
  getDatabasePath,
  checkDatabaseHealth,
  getDatabaseVersion,
  getDb,
  ensureAdminUser,
  getLoanDetails,
  
  // New backup/restore functions
  backupDatabase,
  restoreDatabase
};
