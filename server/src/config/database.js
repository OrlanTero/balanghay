/**
 * Database configuration
 * This file re-exports the database connection from database/db.js
 * to ensure we're using a single database instance throughout the application
 */

// Import the database instance and getDb function from the main database file
const dbModule = require('../database/db');
const { getDb } = dbModule;

// Log message to confirm we're using the consolidated database
console.log('Using consolidated database from database/db.js');

// Export the getDb function instead of the raw db connection
module.exports = getDb; 