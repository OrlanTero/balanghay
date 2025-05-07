/**
 * Re-export App from App.jsx
 * This file exists to bridge the CommonJS require in renderer.js
 * with the ES modules in App.jsx
 */

// Since we need to handle the import/export mismatch between CommonJS and ES modules
const App = require('./App.jsx');

// Re-export the default export
module.exports = App; 