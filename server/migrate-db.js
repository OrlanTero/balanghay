#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * This script initializes the database structure for Balanghay Library System
 * It will create a new database if one doesn't exist and set up all tables
 * with only one admin user (username: admin, password: admin)
 */

const { runMigration } = require('./database/initialize');

console.log('Balanghay Library System - Database Migration');
console.log('=============================================');
console.log('');

// Run the migration
runMigration()
  .then(result => {
    if (result.success) {
      console.log('');
      console.log('Database migration completed successfully!');
      console.log('');
      console.log('Admin user created with the following credentials:');
      console.log('  Username: admin');
      console.log('  Password: admin');
      console.log('  PIN: 000001');
      console.log('');
      console.log('Please change these credentials after your first login for security.');
    } else {
      console.error('');
      console.error('Migration failed:', result.error);
    }
  })
  .catch(err => {
    console.error('');
    console.error('Migration failed with error:', err);
  })
  .finally(() => {
    process.exit(0);
  }); 