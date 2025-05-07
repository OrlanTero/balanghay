/**
 * Application Constants
 * Contains configuration for server connection and other app-wide settings
 */

// Server connection settings
export const SERVER_CONFIG = {
  API_PORT: 3001,                  // Default API port
  DEFAULT_HOST: 'auto',           // Will be determined automatically
  CONNECTION_TIMEOUT: 5000,        // Connection timeout in ms
};

// API Request types
export const REQUEST_TYPES = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
};

// API Routes
export const API_ROUTES = {
  AUTH: '/api/auth',
  BOOKS: '/api/books',
  MEMBERS: '/api/members',
  LOANS: '/api/loans',
  SHELVES: '/api/shelves',
  BOOK_COPIES: '/api/bookcopies',
};

// Construct the API URL dynamically - will be set by the app at runtime
let serverHost = window.localStorage.getItem('serverHost') || SERVER_CONFIG.DEFAULT_HOST;

// Function to construct API URL
export const getApiUrl = (host = serverHost, port = SERVER_CONFIG.API_PORT) => {
  // If host is 'auto', try to fetch from localStorage or use the current window location
  if (host === 'auto') {
    // Get from current window location if we're on the server
    // Otherwise fallback to localhost
    const currentHost = window.location.hostname;
    host = currentHost !== 'localhost' ? currentHost : 'localhost';
  }
  
  return `http://${host}:${port}`;
};

// Update the server host in localStorage
export const setServerHost = (host) => {
  serverHost = host;
  window.localStorage.setItem('serverHost', host);
};

// Application settings
export const APP_CONFIG = {
  APP_NAME: 'Hiraya Balanghay',
  APP_VERSION: '1.0.0',
  MIN_PIN_LENGTH: 4,
  MAX_PIN_LENGTH: 8,
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// Construct the server URL dynamically
export const getSocketUrl = (host = SERVER_CONFIG.DEFAULT_HOST, port = SERVER_CONFIG.SOCKET_PORT) => {
  return `http://${host}:${port}`;
};

// Local storage keys
export const STORAGE_KEYS = {
  SERVER_HOST: 'server_host',
  SERVER_PORT: 'server_port',
  MEMBER_INFO: 'member_info',
  AUTH_TOKEN: 'auth_token',
  SESSION_TIMESTAMP: 'session_timestamp',
  CONNECTION_TIMESTAMP: 'connection_timestamp',
}; 