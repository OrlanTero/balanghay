const knex = require("knex");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");
const crypto = require("crypto");

/**
 * Determines the database path based on whether we're in production or development
 * @returns {string} The full path to the database file
 */
const getDatabasePath = () => {
  // Determine if we're in production mode
  const isProduction = process.env.NODE_ENV === 'production';

  // Get the correct path for the database - different for development vs production
  let dbPath;
  if (isProduction && app && app.isPackaged) {
    // In production, use the userData directory
    dbPath = path.join(app.getPath('userData'), 'database');
  } else {
    // In development, use a local directory
    dbPath = path.join(__dirname, '..', '..', 'database');
  }

  // Ensure the database directory exists
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  return path.join(dbPath, "hiraya_balanghay.sqlite");
};

/**
 * Initialize database connection
 * @returns {Object} Knex database instance
 */
const initDatabaseConnection = () => {
  const dbFilePath = getDatabasePath();
  
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

/**
 * Migrates database schema, creating tables if they don't exist
 * @param {Object} db Knex database instance
 */
const migrateDatabase = async (db) => {
  try {
    console.log("Starting database migration...");

    // Create books table if it doesn't exist
    const hasBooks = await db.schema.hasTable("books");
    if (!hasBooks) {
      console.log("Creating books table...");
      await db.schema.createTable("books", (table) => {
        table.increments("id").primary();
        table.string("title").notNullable();
        table.string("author").notNullable();
        table.string("isbn").unique();
        table.string("category");
        table.string("status").defaultTo("Available");
        table.text("front_cover").nullable(); // Base64 encoded image or URL
        table.text("back_cover").nullable(); // Base64 encoded image or URL
        table.text("spine_cover").nullable(); // Base64 encoded image or URL
        table.string("cover_color").defaultTo("#6B4226"); // Default book color
        table.string("publisher").nullable();
        table.integer("publish_year").nullable();
        table.text("description").nullable();
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });
      console.log("Books table created successfully");
    }

    // Create shelves table if it doesn't exist
    const hasShelves = await db.schema.hasTable("shelves");
    if (!hasShelves) {
      console.log("Creating shelves table...");
      await db.schema.createTable("shelves", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("location").notNullable();
        table.string("section").nullable();
        table.text("description").nullable();
        table.string("code").notNullable(); // Making code field required to match current schema
        table.integer("capacity").defaultTo(100);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });
      console.log("Shelves table created successfully");
    }

    // Create book_copies table if it doesn't exist
    const hasBookCopies = await db.schema.hasTable("book_copies");
    if (!hasBookCopies) {
      console.log("Creating book_copies table...");
      await db.schema.createTable("book_copies", (table) => {
        table.increments("id").primary();
        table
          .integer("book_id")
          .unsigned()
          .references("id")
          .inTable("books")
          .notNullable()
          .onDelete("CASCADE");
        table
          .integer("shelf_id")
          .unsigned()
          .references("id")
          .inTable("shelves")
          .nullable()
          .onDelete("SET NULL");
        table.string("barcode").unique().notNullable();
        table.string("location_code").nullable();
        table.string("status").defaultTo("Available");
        table.text("condition").nullable();
        table.date("acquisition_date").defaultTo(db.fn.now());
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });
      console.log("Book_copies table created successfully");
    }

    // Create members table if it doesn't exist
    const hasMembers = await db.schema.hasTable("members");
    if (!hasMembers) {
      console.log("Creating members table...");
      await db.schema.createTable("members", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("email").unique();
        table.string("phone");
        table.string("membership_type").defaultTo("Standard");
        table.string("status").defaultTo("Active");
        table.string("pin").nullable();
        table.string("qr_code").nullable().unique();
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });
      console.log("Members table created successfully");
    }

    // Create loans table if it doesn't exist
    const hasLoans = await db.schema.hasTable("loans");
    if (!hasLoans) {
      console.log("Creating loans table...");
      await db.schema.createTable("loans", (table) => {
        table.increments("id").primary();
        table
          .integer("book_copy_id")
          .unsigned()
          .references("id")
          .inTable("book_copies")
          .onDelete("CASCADE");
        table
          .integer("member_id")
          .unsigned()
          .references("id")
          .inTable("members")
          .onDelete("CASCADE");
        table.date("checkout_date").notNullable();
        table.date("due_date").notNullable();
        table.date("return_date");
        table.string("status").defaultTo("Borrowed");
        table.integer("rating").nullable();
        table.text("review").nullable();
        table.string("transaction_id").nullable(); // Add transaction_id for grouping loans
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });
      console.log("Loans table created successfully");
    }

    // Create users table if it doesn't exist
    const hasUsers = await db.schema.hasTable("users");
    if (!hasUsers) {
      console.log("Creating users table...");
      await db.schema.createTable("users", (table) => {
        table.increments("id").primary();
        table.string("username").notNullable().unique();
        table.string("email").unique();
        table.string("password").notNullable(); // Would be hashed in production
        table.string("role").defaultTo("librarian");
        table.string("status").defaultTo("active");
        table.string("pin_code").nullable(); // 4-6 digit PIN for quick access
        table.string("qr_auth_key").nullable(); // Key for QR authentication
        table
          .integer("member_id")
          .nullable()
          .references("id")
          .inTable("members")
          .onDelete("SET NULL"); // Link to member record
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });
      console.log("Users table created successfully");
      
      // Add a single admin user as requested
      console.log("Creating admin user...");
      await db("users").insert({
        username: "admin",
        email: "admin@balanghay.com",
        password: "admin", // In a real app, this would be hashed
        role: "admin",
        status: "active",
        pin_code: "123456",
        qr_auth_key: "ADMIN-" + Date.now()
      });
      console.log("Admin user created successfully");
    } else {
      // Ensure admin user exists
      const adminUser = await db("users").where({ username: "admin" }).first();
      
      if (!adminUser) {
        console.log("Admin user not found, creating admin user...");
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
      } else {
        console.log("Admin user already exists, skipping creation");
      }
    }

    return { success: true, message: "Database migration completed successfully" };
  } catch (error) {
    console.error("Database migration error:", error);
    return { 
      success: false, 
      message: "Database migration failed", 
      error: error.message 
    };
  }
};

/**
 * Check database health and repair if needed
 * @param {Object} db Knex database instance
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
    
    // If any table is missing, run migration
    if (!hasBooks || !hasShelves || !hasBookCopies || !hasMembers || !hasLoans || !hasUsers) {
      console.log("Database incomplete, running migration...");
      return await migrateDatabase(db);
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

/**
 * Initialize the database
 */
const initDatabase = async () => {
  const db = initDatabaseConnection();
  
  try {
    // First check if database exists
    const dbExists = fs.existsSync(getDatabasePath());
    
    if (!dbExists) {
      console.log("Database file doesn't exist, creating new database...");
      await migrateDatabase(db);
    } else {
      console.log("Database file exists, checking health...");
      await checkDatabaseHealth(db);
    }
    
    console.log("Database initialization completed successfully");
    return { db, success: true };
  } catch (error) {
    console.error("Database initialization error:", error);
    return { 
      db, 
      success: false, 
      error: error.message 
    };
  }
};

module.exports = {
  initDatabase,
  migrateDatabase,
  checkDatabaseHealth,
  getDatabasePath
}; 