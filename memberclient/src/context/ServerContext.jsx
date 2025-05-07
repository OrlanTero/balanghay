/**
 * Server Context
 * Manages server connection state in the application
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import { STORAGE_KEYS, SERVER_CONFIG } from '../config/constants';
import { 
  setApiBaseUrl, 
  checkServerStatus 
} from '../services/apiService';

// Create context
export const ServerContext = createContext();

// Custom hook to use server context
export const useServer = () => useContext(ServerContext);

// Server provider component
export const ServerProvider = ({ children }) => {
  const [serverHost, setServerHost] = useState(SERVER_CONFIG.DEFAULT_HOST);
  const [serverPort, setServerPort] = useState(SERVER_CONFIG.API_PORT);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [connectionTimestamp, setConnectionTimestamp] = useState(null);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  
  // Initialize server connection from local storage
  useEffect(() => {
    const storedHost = localStorage.getItem(STORAGE_KEYS.SERVER_HOST);
    const storedPort = localStorage.getItem(STORAGE_KEYS.SERVER_PORT);
    const storedTimestamp = localStorage.getItem(STORAGE_KEYS.CONNECTION_TIMESTAMP);
    
    if (storedHost) {
      setServerHost(storedHost);
    }
    
    if (storedPort) {
      setServerPort(parseInt(storedPort, 10));
    }
    
    if (storedTimestamp) {
      setConnectionTimestamp(parseInt(storedTimestamp, 10));
    }
    
    // Auto-connect to the server if we have stored connection details
    if (storedHost && storedPort) {
      // Set the API base URL with the stored values
      setApiBaseUrl(storedHost, parseInt(storedPort, 10));
      
      // Attempt to confirm the connection
      const checkConnection = async () => {
        try {
          await checkServerStatus();
          setConnected(true);
        } catch (err) {
          console.log('Stored server not available:', err.message);
          setConnected(false);
        } finally {
          setAutoConnectAttempted(true);
        }
      };
      
      checkConnection();
    } else {
      setAutoConnectAttempted(true);
    }
  }, []);
  
  /**
   * Connect to the server
   * @param {string} host - Server host
   * @param {number} port - Server port
   * @returns {Promise<Object>} - Connection result
   */
  const connectToServer = async (host, port) => {
    setConnecting(true);
    setError(null);
    
    try {
      // Set API base URL
      setApiBaseUrl(host, port);
      
      // Check if server is available
      await checkServerStatus();
      
      // Update state
      setServerHost(host);
      setServerPort(port);
      setConnected(true);
      
      // Save connection settings and timestamp
      const timestamp = Date.now();
      localStorage.setItem(STORAGE_KEYS.SERVER_HOST, host);
      localStorage.setItem(STORAGE_KEYS.SERVER_PORT, port.toString());
      localStorage.setItem(STORAGE_KEYS.CONNECTION_TIMESTAMP, timestamp.toString());
      setConnectionTimestamp(timestamp);
      
      return { success: true };
    } catch (err) {
      console.error('Server connection error:', err);
      setError(err.message || 'Failed to connect to server');
      setConnected(false);
      return { success: false, error: err.message || 'Failed to connect to server' };
    } finally {
      setConnecting(false);
    }
  };
  
  /**
   * Disconnect from the server
   */
  const disconnectFromServer = () => {
    setConnected(false);
    localStorage.removeItem(STORAGE_KEYS.SERVER_HOST);
    localStorage.removeItem(STORAGE_KEYS.SERVER_PORT);
    localStorage.removeItem(STORAGE_KEYS.CONNECTION_TIMESTAMP);
    setConnectionTimestamp(null);
  };
  
  /**
   * Check if a recent connection exists (less than 24 hours old)
   * @returns {boolean} - Whether there's a valid recent connection
   */
  const hasRecentConnection = () => {
    if (!connected || !connectionTimestamp) return false;
    
    // Check if connection is less than 24 hours old
    const CONNECTION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const currentTime = Date.now();
    
    return (currentTime - connectionTimestamp) < CONNECTION_DURATION;
  };
  
  /**
   * Add a notification
   * @param {Object} notification - The notification to add
   */
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50));
  };
  
  /**
   * Clear all notifications
   */
  const clearNotifications = () => {
    setNotifications([]);
  };
  
  // Context value
  const value = {
    serverHost,
    serverPort,
    connected,
    connecting,
    error,
    notifications,
    connectionTimestamp,
    autoConnectAttempted,
    connectToServer,
    disconnectFromServer,
    addNotification,
    clearNotifications,
    hasRecentConnection
  };
  
  return (
    <ServerContext.Provider value={value}>
      {children}
    </ServerContext.Provider>
  );
};

export default ServerProvider; 