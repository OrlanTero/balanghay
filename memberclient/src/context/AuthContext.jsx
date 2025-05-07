/**
 * Authentication Context
 * Manages authentication state in the application
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import { STORAGE_KEYS } from '../config/constants';
import { authenticateMember, authenticateWithQRCode } from '../services/apiService';

// Create context
export const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Authentication provider component
export const AuthProvider = ({ children }) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionTimestamp, setSessionTimestamp] = useState(null);
  
  // Initialize auth state from local storage
  useEffect(() => {
    const storedMember = localStorage.getItem(STORAGE_KEYS.MEMBER_INFO);
    const storedTimestamp = localStorage.getItem(STORAGE_KEYS.SESSION_TIMESTAMP);
    
    if (storedMember) {
      try {
        setMember(JSON.parse(storedMember));
        if (storedTimestamp) {
          setSessionTimestamp(parseInt(storedTimestamp, 10));
        }
      } catch (err) {
        console.error('Error parsing stored member info:', err);
        localStorage.removeItem(STORAGE_KEYS.MEMBER_INFO);
        localStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
      }
    }
    setLoading(false);
  }, []);
  
  /**
   * Login with email and PIN
   * @param {string} email - Member email
   * @param {string} pin - PIN code
   * @returns {Promise<Object>} - Login result
   */
  const login = async (email, pin) => {
    setLoading(true);
    setError(null);
    
    try {
      // Authenticate with email and PIN
      const response = await authenticateMember({ email, pin });
      const memberData = response.member;
      const authToken = response.token; // Extract token from response
      
      if (memberData) {
        // Store member info and session timestamp in local storage
        const timestamp = Date.now();
        localStorage.setItem(STORAGE_KEYS.MEMBER_INFO, JSON.stringify(memberData));
        localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, timestamp.toString());
        
        // Store authentication token if available
        if (authToken) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken);
        } else {
          console.warn('No authentication token received from server');
        }
        
        setMember(memberData);
        setSessionTimestamp(timestamp);
        
        return { success: true, member: memberData };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Authentication failed');
      return { success: false, error: err.message || 'Authentication failed' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login with QR code
   * @param {string} qrCode - Member QR code
   * @returns {Promise<Object>} - Login result
   */
  const loginWithQRCode = async (qrCode) => {
    setLoading(true);
    setError(null);
    
    try {
      // Authenticate with QR code
      const response = await authenticateWithQRCode({ qr_code: qrCode });
      const memberData = response.member;
      const authToken = response.token;
      
      if (memberData) {
        // Store member info and session timestamp in local storage
        const timestamp = Date.now();
        localStorage.setItem(STORAGE_KEYS.MEMBER_INFO, JSON.stringify(memberData));
        localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, timestamp.toString());
        
        // Store authentication token if available
        if (authToken) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken);
        } else {
          console.warn('No authentication token received from server');
        }
        
        setMember(memberData);
        setSessionTimestamp(timestamp);
        
        return { success: true, member: memberData };
      } else {
        throw new Error('Invalid QR code');
      }
    } catch (err) {
      console.error('QR Login error:', err);
      setError(err.message || 'QR authentication failed');
      return { success: false, error: err.message || 'QR authentication failed' };
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Logout current member
   */
  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.MEMBER_INFO);
    localStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    setMember(null);
    setSessionTimestamp(null);
  };
  
  /**
   * Check if the session is still valid (less than 24 hours old)
   * @returns {boolean} - Whether the session is valid
   */
  const isSessionValid = () => {
    if (!member || !sessionTimestamp) return false;
    
    // Check if session is less than 24 hours old (in milliseconds)
    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const currentTime = Date.now();
    
    return (currentTime - sessionTimestamp) < SESSION_DURATION;
  };
  
  // Context value
  const value = {
    member,
    isAuthenticated: !!member,
    loading,
    error,
    login,
    loginWithQRCode,
    logout,
    isSessionValid,
    sessionTimestamp
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 