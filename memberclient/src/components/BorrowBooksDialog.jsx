import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Grid,
  Chip,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Add as AddIcon, Remove as RemoveIcon, ShoppingCart as CartIcon } from '@mui/icons-material';
import { getAvailableBookCopies, borrowBooks } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

const BorrowBooksDialog = ({ open, onClose, selectedBooks, onSuccess }) => {
  const { member } = useAuth();
  const [loading, setLoading] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [error, setError] = useState(null);
  const [availableCopiesByBook, setAvailableCopiesByBook] = useState({});
  const [selectedCopies, setSelectedCopies] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  
  const receiptRef = useRef(null);
  
  // Set due date to 14 days from today
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 14);
  
  const formattedToday = today.toISOString().split('T')[0];
  const formattedDueDate = dueDate.toISOString().split('T')[0];
  
  // Add state for QR code
  const [qrCodeData, setQrCodeData] = useState("");
  
  // Fetch available copies when selected books change
  useEffect(() => {
    if (open && selectedBooks && selectedBooks.length > 0) {
      fetchAvailableCopies();
    }
  }, [open, selectedBooks]);
  
  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedCopies([]);
      setShowReceipt(false);
      setReceiptData(null);
      setError(null);
    }
  }, [open]);
  
  // Fetch available copies for all selected books
  const fetchAvailableCopies = async () => {
    if (!selectedBooks || selectedBooks.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const copiesData = {};
      
      // Fetch copies for each book in parallel
      const promises = selectedBooks.map(book => 
        getAvailableBookCopies(book.id)
          .then(copies => {
            copiesData[book.id] = {
              book,
              copies: copies || []
            };
          })
      );
      
      await Promise.all(promises);
      setAvailableCopiesByBook(copiesData);
    } catch (err) {
      console.error('Error fetching available copies:', err);
      setError('Failed to load available book copies. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle selection of a book copy
  const handleToggleCopy = (copyId) => {
    setSelectedCopies(prev => {
      if (prev.includes(copyId)) {
        return prev.filter(id => id !== copyId);
      } else {
        return [...prev, copyId];
      }
    });
  };
  
  // Add a function to generate QR code
  const generateQRCode = async (data) => {
    if (!data) {
      console.error("No data provided for QR code generation");
      return "";
    }

    try {
      // Import QRCode dynamically to avoid server-side rendering issues
      const QRCode = (await import('qrcode')).default;
      
      // Create the QR data
      const qrData = {
        transactionId: data.transactionId,
        memberId: data.member.id,
        memberName: data.member.name,
        loansIds: data.loanIds || [],
        checkoutDate: data.checkoutDate,
        dueDate: data.dueDate,
        type: "receipt",
      };

      console.log("Generating QR code with data:", qrData);

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 2,
        errorCorrectionLevel: "H", // High error correction level
        color: {
          dark: "#000",
          light: "#FFF",
        },
      });

      setQrCodeData(qrDataUrl);
      return qrDataUrl;
    } catch (error) {
      console.error("Error generating QR code:", error);
      return "";
    }
  };
  
  // Handle borrowing books
  const handleBorrowBooks = async () => {
    // Check if member info is available
    if (!member) {
      console.error("No member information available");
      setError("No member information available. Please log in again.");
      return;
    }

    // Check if any copies have been selected
    if (selectedCopies.length === 0) {
      console.error("No copies selected");
      setError("Please select at least one book copy to borrow.");
      return;
    }

    try {
      // Log detailed info about what we're sending for debugging
      console.log("Member ID:", member.id);
      console.log("Selected copies:", selectedCopies);
      console.log("Checkout date:", formattedToday);
      console.log("Due date:", formattedDueDate);

      // Prepare data for API
      const borrowData = {
        member_id: member.id,
        book_copies: selectedCopies,
        checkout_date: formattedToday,
        due_date: formattedDueDate
      };

      // Call the API
      const result = await borrowBooks(borrowData);
      
      // Log the entire result for debugging
      console.log("Borrow result:", result);

      if (result && (result.success || result.loans || result.loansIds || result.data)) {
        // Extract loan IDs for the receipt
        let loanIds = [];
        
        // Try different ways to extract the loan IDs based on the response structure
        if (result.loansIds && Array.isArray(result.loansIds)) {
          loanIds = result.loansIds;
        } else if (result.loans && Array.isArray(result.loans)) {
          loanIds = result.loans.map(loan => loan.id);
        } else if (result.data) {
          // Handle different response formats
          if (Array.isArray(result.data)) {
            // If data is an array, extract IDs
            loanIds = result.data.map(item => item.id).filter(id => !!id);
          } else if (result.data.loans && Array.isArray(result.data.loans)) {
            // If data contains a loans array
            loanIds = result.data.loans.map(loan => loan.id);
          } else if (typeof result.data === 'object' && result.data.id) {
            // If data is a single loan object
            loanIds = [result.data.id];
          }
        }
        
        // If we couldn't find any loan IDs, create temporary IDs for the receipt
        if (loanIds.length === 0) {
          loanIds = selectedCopies.map((_, index) => `temp-${Date.now()}-${index}`);
        }

        // Generate receipt data
        const receiptData = {
          transactionId: `LOAN-${Date.now()}-${member.id}`,
          member,
          books: selectedBooks,
          copies: selectedCopies.map(copyId => {
            // Find which book this copy belongs to
            let foundCopy = null;
            
            // Search through all books to find the copy
            for (const bookId in availableCopiesByBook) {
              const bookData = availableCopiesByBook[bookId];
              if (bookData.copies && Array.isArray(bookData.copies)) {
                const copy = bookData.copies.find(c => c.id === copyId);
                if (copy) {
                  foundCopy = copy;
                  break;
                }
              }
            }
            
            return foundCopy || { id: copyId };
          }),
          checkoutDate: formattedToday,
          dueDate: formattedDueDate,
          loanIds,
        };

        setReceiptData(receiptData);
        
        // Generate QR code
        await generateQRCode(receiptData);
        
        setShowReceipt(true);
        onSuccess(result);
      } else {
        // Handle failed borrowing
        setError(
          result.message || 
          "Failed to borrow books. Please try again or contact support."
        );
        console.error("Error in borrow response:", result);
      }
    } catch (error) {
      console.error("Error during borrowing:", error);
      
      // Log error details for debugging
      if (error.response) {
        console.log("Error response status:", error.response.status);
        console.log("Error response data:", error.response.data);
      }
      
      // Provide a user-friendly error message
      let errorMsg = "Failed to borrow books. ";
      
      if (error.message) {
        // If it's a validation error, it will come from our apiService with a clear message
        if (error.message.includes("Validation error")) {
          errorMsg = error.message;
        } else {
          errorMsg += error.message;
        }
      } else if (error.response && error.response.data) {
        // Extract message from server response if available
        const serverMsg = error.response.data.message || 
                        error.response.data.error ||
                        JSON.stringify(error.response.data);
        errorMsg += serverMsg;
      }
      
      setError(errorMsg);
    }
  };
  
  // Handle print receipt
  const handlePrintReceipt = () => {
    if (receiptRef.current) {
      const printContent = receiptRef.current;
      const printWindow = window.open('', '_blank');
      
      printWindow.document.write('<html><head><title>Loan Receipt</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        @page { size: 80mm auto; margin: 0; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 80mm;
          padding: 5mm;
          margin: 0 auto;
        }
        .receipt { width: 100%; }
        .receipt-header {
          text-align: center;
          margin-bottom: 10px;
        }
        .library-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 3px;
        }
        .receipt-title {
          font-size: 14px;
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 5px;
        }
        .member-details, .loan-details {
          margin-bottom: 10px;
        }
        h3 {
          font-size: 13px;
          margin: 5px 0;
          border-bottom: 1px solid #000;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .book-list { margin-top: 5px; }
        .book-item {
          padding: 3px 0;
          border-bottom: 1px dotted #ccc;
        }
        .footer {
          margin-top: 15px;
          font-size: 11px;
          text-align: center;
          border-top: 1px dashed #000;
          padding-top: 5px;
        }
        .due-date { font-weight: bold; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 11px;
        }
        th, td {
          padding: 4px;
          text-align: left;
          border-bottom: 1px dotted #ddd;
        }
        th { font-weight: bold; }
        @media print {
          body { width: 100%; padding: 0; }
          button { display: none; }
        }
      `);
      printWindow.document.write('</style></head><body>');
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write('</body></html>');
      
      printWindow.document.close();
      printWindow.focus();
      
      // Print after a short delay to ensure content is rendered
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      // Format as "MMM DD, YYYY" (e.g., "Jan 01, 2023")
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'N/A';
    }
  };
  
  // Render book cover
  const renderBookCover = (book) => {
    if (!book) return null;
    
    if (book.front_cover) {
      return (
        <Box
          component="img"
          src={book.front_cover}
          alt={`Cover for ${book.title}`}
          sx={{
            width: 40,
            height: 60,
            objectFit: 'cover',
            borderRadius: 1,
            mr: 1
          }}
        />
      );
    } else {
      return (
        <Box
          sx={{
            width: 40,
            height: 60,
            bgcolor: book.cover_color || '#6B4226',
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            fontSize: '8px',
            textAlign: 'center',
            lineHeight: 1,
            p: 0.5,
            mr: 1
          }}
        >
          {book.title}
        </Box>
      );
    }
  };
  
  // Add this new function to help with debugging
  const handleDebugClick = () => {
    console.log('=== DEBUG INFO ===');
    console.log('Selected Books:', selectedBooks);
    console.log('Available Copies By Book:', availableCopiesByBook);
    console.log('Selected Copies:', selectedCopies);
    console.log('Member:', member);
    console.log('=================');
    
    // Create a more detailed error message
    const bookAvailabilityInfo = Object.entries(availableCopiesByBook).map(([bookId, data]) => {
      return `Book ID ${bookId}: ${data.copies?.length || 0} copies available`;
    }).join('\n');
    
    // Show debugging info in the UI
    setError(`
      Debug Mode: Found ${Object.keys(availableCopiesByBook).length} books with copies.
      Selected ${selectedCopies.length} copies.
      Member ID: ${member?.id || 'Unknown'}
      
      Book Availability Details:
      ${bookAvailabilityInfo || 'No book availability information found'}
    `);
    
    // Try to manually fetch the first book's copies again to see the response
    if (selectedBooks.length > 0) {
      const firstBookId = selectedBooks[0].id;
      setError(prev => `${prev}\n\nTrying to fetch copies again for book ID: ${firstBookId}...`);
      
      // Diagnostics: Try different endpoint formats
      const endpointsToTry = [
        `/api/book-copies/book/${firstBookId}`,
        `/api/book-copies/book/${firstBookId}/availability`,
        `/api/books/${firstBookId}/copies`
      ];
      
      // Function to try an endpoint
      const tryEndpoint = async (endpoint) => {
        try {
          const authToken = localStorage.getItem('authToken');
          const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
          
          setError(prev => `${prev}\nTrying endpoint: ${endpoint}...`);
          const response = await fetch(`${window.location.origin}${endpoint}`, { headers });
          
          // Check status
          if (!response.ok) {
            setError(prev => `${prev}\n- ${endpoint}: ERROR ${response.status}`);
            return false;
          }
          
          // Try to parse response
          const data = await response.json();
          setError(prev => `${prev}\n- ${endpoint}: SUCCESS, found ${Array.isArray(data) ? data.length : 'non-array'} items`);
          console.log(`Response from ${endpoint}:`, data);
          return true;
        } catch (err) {
          setError(prev => `${prev}\n- ${endpoint}: FAILED - ${err.message}`);
          return false;
        }
      };
      
      // Try all endpoints
      (async () => {
        for (const endpoint of endpointsToTry) {
          await tryEndpoint(endpoint);
        }
        
        // Also check server status
        try {
          setError(prev => `${prev}\n\nVerifying server connection...`);
          const response = await fetch(`${window.location.origin}/api`);
          setError(prev => `${prev}\nServer responded with status: ${response.status}`);
        } catch (err) {
          setError(prev => `${prev}\nServer connection check failed: ${err.message}`);
        }
      })();
    }
  };
  
  // Render copy selection view
  const renderCopySelection = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    return (
      <>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Select Book Copies to Borrow
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Please select the specific copies of each book you would like to borrow.
            You have selected {selectedCopies.length} {selectedCopies.length === 1 ? 'copy' : 'copies'} so far.
          </Typography>
          
          {/* Debug button - only show in development */}
          {process.env.NODE_ENV !== 'production' && (
            <Button 
              variant="outlined" 
              color="warning" 
              size="small" 
              onClick={handleDebugClick}
              sx={{ mt: 1, mb: 2 }}
            >
              Debug API
            </Button>
          )}
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
        
        {Object.keys(availableCopiesByBook).length === 0 ? (
          <Alert severity="info" sx={{ my: 2 }}>
            No books selected or no copies available.
          </Alert>
        ) : (
          Object.values(availableCopiesByBook).map(({ book, copies }) => (
            <Paper key={book.id} elevation={2} sx={{ mb: 3, p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                {renderBookCover(book)}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    {book.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    by {book.author}
                  </Typography>
                  {book.isbn && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      ISBN: {book.isbn}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {copies && copies.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">Select</TableCell>
                        <TableCell>Barcode</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Condition</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {copies.map(copy => (
                        <TableRow 
                          key={copy.id}
                          onClick={() => handleToggleCopy(copy.id)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: selectedCopies.includes(copy.id) 
                              ? 'rgba(25, 118, 210, 0.08)' 
                              : 'inherit',
                            '&:hover': {
                              bgcolor: selectedCopies.includes(copy.id)
                                ? 'rgba(25, 118, 210, 0.12)'
                                : 'rgba(0, 0, 0, 0.04)'
                            }
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedCopies.includes(copy.id)}
                              onChange={() => handleToggleCopy(copy.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell>{copy.barcode || 'N/A'}</TableCell>
                          <TableCell>{copy.location_code || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={copy.condition || 'Unknown'}
                              color={
                                copy.condition === 'New' ? 'success' :
                                copy.condition === 'Good' ? 'info' :
                                copy.condition === 'Fair' ? 'warning' : 'error'
                              }
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  No available copies for this book
                </Alert>
              )}
            </Paper>
          ))
        )}
        
        {selectedCopies.length > 0 && (
          <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'white', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {selectedCopies.length} {selectedCopies.length === 1 ? 'copy' : 'copies'} selected for borrowing
            </Typography>
          </Paper>
        )}
      </>
    );
  };
  
  // Render receipt view
  const renderReceipt = () => {
    if (!receiptData) return null;
    
    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button 
            variant="contained"
            onClick={handlePrintReceipt}
            sx={{ mr: 1 }}
          >
            Print Receipt
          </Button>
        </Box>
        
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box ref={receiptRef} className="receipt">
            <Box className="receipt-header">
              <Typography className="library-name" variant="h6">
                Hiraya Balanghay Library
              </Typography>
              <Typography className="receipt-title" variant="subtitle2">
                Book Loan Receipt
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Box className="member-details">
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Member Information
                  </Typography>
                  <Box className="detail-row">
                    <Typography variant="body2">Name:</Typography>
                    <Typography variant="body2">
                      {receiptData.member.name}
                    </Typography>
                  </Box>
                  <Box className="detail-row">
                    <Typography variant="body2">ID:</Typography>
                    <Typography variant="body2">
                      {receiptData.member.id}
                    </Typography>
                  </Box>
                </Box>
                
                <Box className="loan-details" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Loan Information
                  </Typography>
                  <Box className="detail-row">
                    <Typography variant="body2">Transaction:</Typography>
                    <Typography variant="body2">
                      {receiptData.transactionId.split('-')[1]}
                    </Typography>
                  </Box>
                  <Box className="detail-row">
                    <Typography variant="body2">Checkout:</Typography>
                    <Typography variant="body2">
                      {formatDate(receiptData.checkoutDate)}
                    </Typography>
                  </Box>
                  <Box className="detail-row">
                    <Typography variant="body2">Due Date:</Typography>
                    <Typography variant="body2" className="due-date">
                      {formatDate(receiptData.dueDate)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box className="qr-section" sx={{ textAlign: 'center' }}>
                  {qrCodeData ? (
                    <Box>
                      <Box
                        component="img"
                        src={qrCodeData}
                        alt="Loan QR Code"
                        sx={{
                          width: 120,
                          height: 120,
                          border: '1px solid #eee',
                          borderRadius: 1,
                          p: 1,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}
                      >
                        Scan for quick return
                      </Typography>
                    </Box>
                  ) : (
                    <CircularProgress size={24} />
                  )}
                </Box>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Borrowed Items ({receiptData.books.length || 0})
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="none" sx={{ pl: 1 }}>Title</TableCell>
                    <TableCell padding="none">Author</TableCell>
                    <TableCell padding="none">Copy Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receiptData.books.map((book, index) => (
                    <TableRow key={book.id}>
                      <TableCell padding="none" sx={{ pl: 1 }}>{book.title}</TableCell>
                      <TableCell padding="none">{book.author}</TableCell>
                      <TableCell padding="none">
                        {receiptData.copies && receiptData.copies[index] ? (
                          <Box>
                            <Typography variant="caption" display="block">
                              Barcode: {receiptData.copies[index].barcode || 'N/A'}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Location: {receiptData.copies[index].location_code || 'N/A'}
                            </Typography>
                          </Box>
                        ) : (
                          'No copy details'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box className="footer">
              <Typography variant="body2" sx={{ mb: 1 }}>
                Thank you for using Hiraya Balanghay Library!
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                Please keep this receipt and return by: {formatDate(receiptData.dueDate)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '50vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {showReceipt ? 'Borrowing Receipt' : 'Borrow Books'}
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && !showReceipt && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {showReceipt ? renderReceipt() : renderCopySelection()}
      </DialogContent>
      
      {!showReceipt && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Box sx={{ mr: 'auto' }}>
            <Typography variant="body2" color="text.secondary">
              {selectedCopies.length} {selectedCopies.length === 1 ? 'copy' : 'copies'} selected
            </Typography>
          </Box>
          <Button onClick={onClose} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={borrowing ? <CircularProgress size={20} /> : <CartIcon />}
            onClick={handleBorrowBooks}
            disabled={borrowing || selectedCopies.length === 0}
          >
            {borrowing ? 'Processing...' : 'Borrow Selected Books'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default BorrowBooksDialog; 