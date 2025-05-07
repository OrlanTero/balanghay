/**
 * Setup script for Balanghay Member Client
 * Creates necessary directories and installs dependencies
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Setting up Balanghay Member Client...');

// Create build directory if it doesn't exist
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  console.log('Creating build directory...');
  fs.mkdirSync(buildDir);
}

// Create renderer directory if it doesn't exist
const rendererDir = path.join(__dirname, 'src', 'renderer');
if (!fs.existsSync(rendererDir)) {
  console.log('Creating renderer directory...');
  fs.mkdirSync(rendererDir);
}

// Install dependencies
console.log('Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('Dependencies installed successfully.');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
  process.exit(1);
}

// Build the application
console.log('Building the application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Application built successfully.');
} catch (error) {
  console.error('Error building application:', error.message);
  process.exit(1);
}

console.log('\nSetup complete! You can now run the application with:');
console.log('npm start'); 