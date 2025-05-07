/**
 * API Service
 * Handles API requests to the server
 */
import axios from 'axios';
import { getApiUrl, STORAGE_KEYS } from '../config/constants';

// Create axios instance
const api = axios.create({
  timeout: 10000,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  config => {
    console.log(`📤 API REQUEST: ${config.method.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data,
      params: config.params
    });
    return config;
  },
  error => {
    console.error('📤 REQUEST ERROR:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  response => {
    console.log(`📥 API RESPONSE (${response.status}): ${response.config.method.toUpperCase()} ${response.config.url}`, {
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  error => {
    if (error.response) {
      console.error(`📥 RESPONSE ERROR (${error.response.status}): ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('📥 NO RESPONSE RECEIVED:', error.request);
    } else {
      console.error('📥 REQUEST SETUP ERROR:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Set the API base URL
 * @param {string} host - Server host
 * @param {number} port - Server port
 */
export const setApiBaseUrl = (host, port) => {
  api.defaults.baseURL = getApiUrl(host, port);
  
  // Save connection settings to local storage
  localStorage.setItem(STORAGE_KEYS.SERVER_HOST, host);
  localStorage.setItem(STORAGE_KEYS.SERVER_PORT, port);
};

/**
 * Authenticate member with email and PIN
 * @param {Object} credentials - Authentication credentials
 * @param {string} credentials.email - Member email
 * @param {string} credentials.pin - PIN code
 * @returns {Promise<Object>} - Member data
 */
export const authenticateMember = async (credentials) => {
  try {
    console.log('Authenticating with credentials:', credentials);
    
    // Use the dedicated member login endpoint that accepts email and PIN
    const response = await api.post('/api/members/member-login', {
      email: credentials.email,
      pin: credentials.pin
    });
    
    console.log('Authentication response:', response.data);
    
    // Check if the server provided a token
    if (!response.data.token) {
      console.warn('No token returned from authentication response');
      
      // If no token exists but we got a member, create a simple token
      // This is a workaround if the server doesn't provide tokens
      if (response.data.member && response.data.member.id) {
        const simpleToken = `member_${response.data.member.id}_${Date.now()}`;
        console.log('Created simple token:', simpleToken);
        response.data.token = simpleToken;
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Add more detailed error logging
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      
      // Provide a user-friendly error message based on the response
      if (error.response.status === 401) {
        throw new Error('Invalid email or PIN');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('Server not responding. Please check your connection.');
    } else {
      console.error('Error message:', error.message);
    }
    
    throw error.response?.data?.message 
      ? new Error(error.response.data.message) 
      : error;
  }
};

/**
 * Authenticate member with QR code
 * @param {Object} credentials - Authentication credentials
 * @param {string} credentials.qr_code - Member QR code
 * @returns {Promise<Object>} - Member data
 */
export const authenticateWithQRCode = async (credentials) => {
  try {
    console.log('Authenticating with QR code');
    
    // Use the QR code authentication endpoint
    const response = await api.post('/api/members/qr-login', {
      qr_code: credentials.qr_code
    });
    
    console.log('QR Authentication response:', response.data);
    
    // Check if the server provided a token
    if (!response.data.token) {
      console.warn('No token returned from QR authentication response');
      
      // If no token exists but we got a member, create a simple token
      if (response.data.member && response.data.member.id) {
        const simpleToken = `member_${response.data.member.id}_${Date.now()}`;
        console.log('Created simple token:', simpleToken);
        response.data.token = simpleToken;
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('QR Authentication error:', error);
    
    // Add more detailed error logging
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      
      // Provide a user-friendly error message based on the response
      if (error.response.status === 401) {
        throw new Error('Invalid QR code');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('Server not responding. Please check your connection.');
    } else {
      console.error('Error message:', error.message);
    }
    
    throw error.response?.data?.message 
      ? new Error(error.response.data.message) 
      : error;
  }
};

/**
 * Get member by email
 * @param {string} email - Member email
 * @returns {Promise<Object>} - Member data
 */
export const getMemberByEmail = async (email) => {
  try {
    const response = await api.get(`/api/members/email/${email}`);
    return response.data;
  } catch (error) {
    console.error('Error getting member by email:', error);
    throw error.response?.data || error;
  }
};

/**
 * Check if the server is available
 * @returns {Promise<Object>} - Server status
 */
export const checkServerStatus = async () => {
  try {
    // First try to make a HEAD request to the API to check if it's available
    try {
      await api.head('/api');
      return { status: 'ok', message: 'Server is up' };
    } catch (headError) {
      // If HEAD fails with a 404, the route might not exist but server might be up
      if (headError.response && headError.response.status) {
        return { status: 'ok', message: 'Server is up' };
      }
      
      // If no response at all, try OPTIONS as a fallback
      try {
        await api.options('/api');
        return { status: 'ok', message: 'Server is up' };
      } catch (optionsError) {
        // Final attempt - basic GET request with a very short timeout
        const originalTimeout = api.defaults.timeout;
        api.defaults.timeout = 3000;
        
        try {
          // Try a GET request to the base URL
          await api.get('/api');
          return { status: 'ok', message: 'Server is up' };
        } catch (getError) {
          // Check if we at least got a response (even an error response)
          if (getError.response) {
            return { status: 'ok', message: 'Server is up' };
          }
          throw getError;
        } finally {
          // Restore original timeout
          api.defaults.timeout = originalTimeout;
        }
      }
    }
  } catch (error) {
    console.error('Server status check error:', error);
    throw new Error('Cannot connect to server. Please check if the server is running and the port is correct.');
  }
};

/**
 * Get member's active loans
 * @param {number} memberId - Member ID
 * @returns {Promise<Array>} - Loans data
 */
export const getMemberLoans = async (memberId) => {
  try {
    // Add auth token from local storage if available
    const authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    // Log the request for debugging
    console.log(`Fetching loans for member ${memberId}`);
    
    const response = await api.get(`/api/members/${memberId}/loans`, { headers });
    console.log('Loans response:', response.data);
    
    // Handle different response formats
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.loans && Array.isArray(response.data.loans)) {
      return response.data.loans;
    } else if (response.data && response.data.member && response.data.member.loans && Array.isArray(response.data.member.loans)) {
      return response.data.member.loans;
    } else {
      console.warn('Unexpected loans response format:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error getting member loans:', error);
    // Add more detailed error logging
    if (error.response) {
      console.error('Error response status:', error.response.status);
      if (error.response.status === 401) {
        console.error('Authentication error: Token may be invalid or expired');
      }
    }
    
    // Return empty array on error instead of throwing
    return [];
  }
};

/**
 * Get member statistics
 * @param {number} memberId - Member ID
 * @returns {Promise<Object>} - Member statistics
 */
export const getMemberStats = async (memberId) => {
  try {
    // Add auth token from local storage if available
    const authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    // Log the request for debugging
    console.log(`Fetching statistics for member ${memberId}`);
    
    const response = await api.get(`/api/members/${memberId}/statistics`, { headers });
    console.log('Statistics response:', response.data);
    
    // The server returns the stats directly
    if (response.data && response.data.stats) {
      return { stats: response.data.stats };
    } else if (response.data && response.data.member && response.data.stats) {
      // Sometimes the API returns both member and stats
      return { stats: response.data.stats };
    } else if (response.data) {
      // Handle case where stats might be at the top level
      return { stats: response.data };
    } else {
      // Return default stats structure if no data
      return { 
        stats: {
          total_loans: 0,
          active_loans: 0,
          returned_loans: 0,
          overdue_loans: 0
        }
      };
    }
  } catch (error) {
    console.error('Error getting member statistics:', error);
    // Add more detailed error logging
    if (error.response) {
      console.error('Error response status:', error.response.status);
      if (error.response.status === 401) {
        console.error('Authentication error: Token may be invalid or expired');
      }
    }
    
    // Return default stats on error instead of throwing
    return { 
      stats: {
        total_loans: 0,
        active_loans: 0,
        returned_loans: 0,
        overdue_loans: 0
      }
    };
  }
};

/**
 * Get all books from the library
 * @returns {Promise<Array>} - Books data
 */
export const getBooks = async () => {
  try {
    // Add auth token from local storage if available
    const authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    const response = await api.get('/api/books', { headers });
    
    // Check if books are in a 'books' property (as returned by the server)
    if (response.data && response.data.books && Array.isArray(response.data.books)) {
      return response.data.books;
    }
    
    // Fallback to direct response if it's an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error getting books:', error);
    // Add more detailed error logging
    if (error.response) {
      console.error('Error response status:', error.response.status);
      if (error.response.status === 401) {
        console.error('Authentication error: Token may be invalid or expired');
      }
    }
    return [];
  }
};

/**
 * Borrow books from the library
 * @param {Object} borrowData - Borrow request data
 * @param {number} borrowData.member_id - Member ID
 * @param {Array<number>} borrowData.book_copies - Array of book copy IDs to borrow
 * @param {string} borrowData.checkout_date - Checkout date (YYYY-MM-DD)
 * @param {string} borrowData.due_date - Due date (YYYY-MM-DD)
 * @returns {Promise<Object>} - Borrow result with loans data
 */
export const borrowBooks = async (borrowData) => {
  try {
    // Add auth token from local storage if available
    const authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    // Log the borrow request for debugging
    console.log('Borrowing books with data:', borrowData);
    
    // We've updated the server to support the /api/loans/borrow endpoint without staff privileges
    // This endpoint accepts the same format as our client is already using
    try {
      console.log('Trying /api/loans/borrow endpoint');
      const response = await api.post('/api/loans/borrow', borrowData, { headers });
      console.log('Borrow response:', response.data);
      
      // Process the response
      let loanIds = [];
      
      if (response.data && response.data.loans && Array.isArray(response.data.loans)) {
        loanIds = response.data.loans.map(loan => loan.id);
      } else if (Array.isArray(response.data)) {
        loanIds = response.data.map(loan => loan.id);
      }
      
      return {
        success: true,
        message: response.data.message || 'Books borrowed successfully',
        loansIds: loanIds,
        data: response.data
      };
    } catch (error) {
      console.error('Primary endpoint failed:', error);
      
      // If the primary endpoint failed, try the member-specific endpoint
      // This is for backward compatibility with older server versions
      if (error.response && (error.response.status === 404 || error.response.status === 403)) {
        console.log('Trying member-specific endpoint');
        const memberId = borrowData.member_id;
        
        // Format data for member-specific borrow endpoint
        const memberBorrowData = {
          book_copies: borrowData.book_copies.map(id => Number(id)),
          checkout_date: borrowData.checkout_date,
          due_date: borrowData.due_date
        };
        
        try {
          const response = await api.post(`/api/members/${memberId}/borrow`, memberBorrowData, { headers });
          console.log('Member borrow response:', response.data);
          
          // Process response
          let loanIds = [];
          
          if (Array.isArray(response.data)) {
            loanIds = response.data.map(loan => loan.id).filter(id => !!id);
          } else if (response.data && response.data.loans && Array.isArray(response.data.loans)) {
            loanIds = response.data.loans.map(loan => loan.id);
          } else if (response.data && response.data.id) {
            loanIds = [response.data.id];
          }
          
          return {
            success: true,
            message: 'Books borrowed successfully',
            loansIds: loanIds,
            data: response.data
          };
        } catch (memberError) {
          console.error('Member endpoint failed:', memberError);
          
          // Last fallback: try the generic loans endpoint
          try {
            console.log('Trying generic loans endpoint');
            const response = await api.post('/api/loans', borrowData, { headers });
            console.log('Generic loans endpoint response:', response.data);
            
            // Process response
            let loanIds = [];
            
            if (Array.isArray(response.data)) {
              loanIds = response.data.map(loan => loan.id).filter(id => !!id);
            } else if (response.data && response.data.loans && Array.isArray(response.data.loans)) {
              loanIds = response.data.loans.map(loan => loan.id);
            } else if (response.data && response.data.id) {
              loanIds = [response.data.id];
            }
            
            return {
              success: true,
              message: 'Books borrowed successfully',
              loansIds: loanIds,
              data: response.data
            };
          } catch (lastError) {
            console.error('All endpoints failed:', lastError);
            throw new Error('All available borrowing endpoints failed. Please contact support for assistance.');
          }
        }
      } else {
        // For non-404/403 errors, rethrow the original error
        throw error;
      }
    }
  } catch (error) {
    console.error('Error borrowing books:', error);
    
    // Provide more detailed error information for debugging
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      
      // If we have a validation error (422), extract and show the validation message
      if (error.response.status === 422 && error.response.data) {
        const validationMessage = error.response.data.message || 
                                 error.response.data.error || 
                                 'Validation error in request data';
        throw new Error(`Validation error: ${validationMessage}`);
      }
      
      // If we have a specific error message from the server, use it
      if (error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      }
    }
    
    throw error;
  }
};

/**
 * Get available copies for a book
 * @param {number} bookId - Book ID
 * @returns {Promise<Array>} - Available copies data
 */
export const getAvailableBookCopies = async (bookId) => {
  try {
    // Add auth token from local storage if available
    const authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    console.log(`Fetching available copies for book ${bookId}`);
    
    // Based on server/src/routes/bookCopyRoutes.js, directly use the endpoint:
    // "router.get('/book/:bookId', validateIdParam('bookId'), bookCopyController.getBookCopiesByBookId);"
    const response = await api.get(`/api/book-copies/book/${bookId}`, { headers });
    console.log(`Found ${response.data?.length || 0} copies for book ID ${bookId}`);
    
    // Handle different response formats
    let copies = [];
    
    if (Array.isArray(response.data)) {
      copies = response.data;
    } else if (response.data && response.data.copies && Array.isArray(response.data.copies)) {
      copies = response.data.copies;
    } else if (response.data && response.data.book_copies && Array.isArray(response.data.book_copies)) {
      copies = response.data.book_copies;
    } else {
      console.warn('Unexpected book copies response format:', response.data);
      return [];
    }
    
    // Filter to only include available copies with case-insensitive matching
    const availableCopies = copies.filter(copy => {
      const status = (copy.status || '').toLowerCase();
      return status === 'available';
    });
    
    console.log(`Found ${availableCopies.length} available copies for book ID ${bookId}`, availableCopies);
    return availableCopies;
  } catch (error) {
    console.error(`Error getting available copies for book ${bookId}:`, error);
    
    // Try with getBookAvailability endpoint from server/src/routes/bookCopyRoutes.js
    try {
      console.log(`Trying book availability endpoint for book ${bookId}`);
      const authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      
      const response = await api.get(`/api/book-copies/book/${bookId}/availability`, { headers });
      console.log(`Book availability response for book ${bookId}:`, response.data);
      
      if (response.data && response.data.availableCopies && Array.isArray(response.data.availableCopies)) {
        return response.data.availableCopies; 
      }
      
      // Return empty array as fallback
      console.warn('No copies found in availability response');
      return [];
    } catch (error) {
      console.error(`All attempts failed for book ${bookId}:`, error);
      return [];
    }
  }
};

/**
 * Return books
 * @param {Object} returnData - The data for returning books
 * @param {Array} returnData.returns - Array of book returns (loan_id, returnCondition, note)
 * @returns {Promise<Object>} - Result of the return operation
 */
export const returnBooks = async (returnData) => {
  try {
    console.log('Returning books with data:', returnData);
    
    // Add auth token from local storage if available
    const authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    // First try the member-specific batch returns endpoint
    try {
      const response = await api.post('/api/loans/member-return', returnData, { headers });
      console.log('Return response:', response.data);
      return { success: true, ...response.data };
    } catch (error) {
      // If the member endpoint fails with 404, try the staff endpoint as fallback
      if (error.response && error.response.status === 404) {
        console.log('Member return endpoint not found, trying staff endpoint');
        
        try {
          const response = await api.post('/api/loans/return', returnData, { headers });
          console.log('Staff return response:', response.data);
          return { success: true, ...response.data };
        } catch (staffError) {
          // If both batch endpoints fail, try individual loan return
          if (returnData.returns.length === 1) {
            console.log('Trying individual loan return endpoint');
            const loanId = returnData.returns[0].loanId;
            const returnInfo = returnData.returns[0];
            
            const response = await api.post(`/api/loans/${loanId}/return`, {
              returnCondition: returnInfo.returnCondition,
              note: returnInfo.note
            }, { headers });
            
            console.log('Individual return response:', response.data);
            return { success: true, ...response.data };
          } else {
            throw staffError;
          }
        }
      } else {
        // For other errors, rethrow
        throw error;
      }
    }
  } catch (error) {
    console.error('Error returning books:', error);
    
    // Format user-friendly error response
    let errorMessage = 'Failed to return books';
    
    if (error.response) {
      if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.response.status === 403) {
        errorMessage = 'You are not authorized to return these books';
      } else if (error.response.status === 404) {
        errorMessage = 'The loan(s) could not be found';
      } else if (error.response.status === 422) {
        errorMessage = 'Invalid return data provided';
      } else if (error.response.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, message: errorMessage };
  }
};

export default api; 