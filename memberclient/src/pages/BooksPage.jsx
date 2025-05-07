/**
 * Books Page
 * Displays available books with search feature
 */
import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  Alert,
  Button,
  Chip,
  Snackbar,
  IconButton,
  Fab,
  Badge,
  CardActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import InfoIcon from '@mui/icons-material/Info';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getBooks, getAvailableBookCopies } from '../services/apiService';
import BorrowBooksDialog from '../components/BorrowBooksDialog';
import BookDetailsModal from '../components/BookDetailsModal';

const BooksPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { member } = useAuth();
  
  // State for book borrowing
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [showBorrowDialog, setShowBorrowDialog] = useState(false);
  
  // State for book details modal
  const [selectedBook, setSelectedBook] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    // Fetch books from the server
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const booksData = await getBooks();
        setBooks(Array.isArray(booksData) ? booksData : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError('Failed to load books. Please try again later.');
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // Filter books based on search term
  const filteredBooks = books.filter(book => 
    book && (
      (book.title && book.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (book.category && book.category.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );
  
  // Handle selecting a book for borrowing
  const handleSelectBook = (book) => {
    if (!book) return;
    
    // Check if the book is available
    if (book.status !== 'Available') {
      setSnackbar({
        open: true,
        message: `Sorry, "${book.title}" is currently ${book.status.toLowerCase()}.`,
        severity: 'warning'
      });
      return;
    }
    
    // Check if the book is already selected
    if (selectedBooks.some(selectedBook => selectedBook.id === book.id)) {
      setSnackbar({
        open: true,
        message: `"${book.title}" is already in your borrowing cart.`,
        severity: 'info'
      });
      return;
    }
    
    // Add book to selection
    setSelectedBooks(prev => [...prev, book]);
    
    setSnackbar({
      open: true,
      message: `"${book.title}" added to borrowing cart.`,
      severity: 'success'
    });
  };
  
  // Handle removing a book from selection
  const handleRemoveBook = (bookId) => {
    setSelectedBooks(prev => prev.filter(book => book.id !== bookId));
  };
  
  // Open book details modal
  const handleOpenDetails = (book) => {
    setSelectedBook(book);
    setShowDetailsModal(true);
  };
  
  // Close book details modal
  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedBook(null);
  };
  
  // Open borrow dialog
  const handleOpenBorrowDialog = async () => {
    if (selectedBooks.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select at least one book to borrow.',
        severity: 'warning'
      });
      return;
    }
    
    if (!member) {
      setSnackbar({
        open: true,
        message: 'Please log in to borrow books.',
        severity: 'error'
      });
      return;
    }
    
    // Pre-check if we can get book copies for the first book
    // This helps validate the API without showing errors in the dialog
    try {
      setSnackbar({
        open: true,
        message: 'Checking book availability...',
        severity: 'info'
      });
      
      const firstBookId = selectedBooks[0].id;
      const copies = await getAvailableBookCopies(firstBookId);
      
      console.log(`Pre-check: Found ${copies.length} copies for book ID ${firstBookId}`);
      
      if (copies.length === 0) {
        // Still open the dialog, but show a warning
        setSnackbar({
          open: true,
          message: 'Warning: No available copies found for one or more books.',
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Found ${copies.length} available copies.`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error in availability pre-check:', error);
      
      // Still open the dialog even if the pre-check fails
      setSnackbar({
        open: true,
        message: 'Warning: Could not verify book availability.',
        severity: 'warning'
      });
    }
    
    // Open the dialog regardless of pre-check result
    // Let the dialog component handle the errors internally
    setShowBorrowDialog(true);
  };
  
  // Close borrow dialog
  const handleCloseBorrowDialog = () => {
    setShowBorrowDialog(false);
  };
  
  // Handle successful borrowing
  const handleBorrowSuccess = (result) => {
    setSnackbar({
      open: true,
      message: `Successfully borrowed ${selectedBooks.length} book(s).`,
      severity: 'success'
    });
    
    // Reset selected books
    setSelectedBooks([]);
    
    // Refresh the book list to update availability
    fetchBooks();
  };
  
  // Fetch books from the server
  const fetchBooks = async () => {
    try {
      const booksData = await getBooks();
      setBooks(Array.isArray(booksData) ? booksData : []);
    } catch (err) {
      console.error('Error fetching books:', err);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };
  
  const renderNoBooks = () => (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No books found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {searchTerm ? 
          `No books matching "${searchTerm}" were found. Try another search term.` : 
          'There are no books in the library system yet.'}
      </Typography>
    </Paper>
  );
  
  const defaultCoverColor = '#1976d2'; // Default cover color
  
  const renderBookCard = (book) => {
    if (!book) return null;
    
    const isSelected = selectedBooks.some(selectedBook => selectedBook.id === book.id);
    
    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={book.id || Math.random()}>
        <Card 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'transform 0.3s',
            border: isSelected ? '2px solid #2196f3' : 'none',
            '&:hover': {
              transform: 'scale(1.03)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
            }
          }}
        >
          {book.front_cover ? (
            <CardMedia
              component="img"
              height="180"
              image={book.front_cover}
              alt={book.title || 'Book cover'}
            />
          ) : (
            <Box 
              sx={{ 
                height: 180, 
                bgcolor: book.cover_color || defaultCoverColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                color: 'white'
              }}
            >
              <Typography variant="h6" align="center" sx={{ wordBreak: 'break-word' }}>
                {book.title || 'Untitled Book'}
              </Typography>
            </Box>
          )}
          <CardContent sx={{ flexGrow: 1 }}>
            <Typography gutterBottom variant="h6" component="div" noWrap>
              {book.title || 'Untitled Book'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Author: {book.author || 'Unknown'}
            </Typography>
            {book.category && (
              <Typography variant="body2" color="text.secondary">
                Category: {book.category}
              </Typography>
            )}
            <Typography 
              variant="body2" 
              sx={{ 
                mt: 1, 
                p: 0.5, 
                borderRadius: 1, 
                display: 'inline-block',
                bgcolor: book.status === 'Available' ? 'success.light' : 'error.light',
                color: book.status === 'Available' ? 'success.contrastText' : 'error.contrastText'
              }}
            >
              {book.status || 'Unknown'}
            </Typography>
          </CardContent>
          <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<InfoIcon />}
              onClick={() => handleOpenDetails(book)}
            >
              Details
            </Button>
            <Button 
              size="small"
              variant="contained"
              color={isSelected ? "error" : "primary"}
              startIcon={isSelected ? null : <LibraryAddIcon />}
              onClick={() => isSelected ? handleRemoveBook(book.id) : handleSelectBook(book)}
              disabled={book.status !== 'Available'}
            >
              {isSelected ? 'Remove' : 'Borrow'}
            </Button>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Books
          </Typography>
          {selectedBooks.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ShoppingCartIcon />}
              onClick={handleOpenBorrowDialog}
            >
              Borrow ({selectedBooks.length})
            </Button>
          )}
        </Box>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Browse our collection of books and find your next great read.
        </Typography>
        
        {/* Search field */}
        <TextField
          fullWidth
          margin="normal"
          variant="outlined"
          placeholder="Search by title, author or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 4 }}
        />
        
        {/* Error message */}
        {error && !loading && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Selected Books Summary */}
        {selectedBooks.length > 0 && (
          <Paper
            elevation={3}
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'primary.light',
              color: 'white'
            }}
          >
            <Typography variant="subtitle1">
              You have selected {selectedBooks.length} book(s) to borrow
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {selectedBooks.map(book => (
                <Chip
                  key={book.id}
                  label={book.title}
                  onDelete={() => handleRemoveBook(book.id)}
                  color="default"
                  sx={{ bgcolor: 'rgba(255, 255, 255, 0.8)', color: 'primary.dark' }}
                />
              ))}
            </Box>
          </Paper>
        )}
        
        {/* Books grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredBooks.length > 0 ? (
          <Grid container spacing={3}>
            {filteredBooks.map(renderBookCard)}
          </Grid>
        ) : (
          renderNoBooks()
        )}
      </Box>
      
      {/* Borrow Books Dialog */}
      <BorrowBooksDialog
        open={showBorrowDialog}
        onClose={handleCloseBorrowDialog}
        selectedBooks={selectedBooks}
        onSuccess={handleBorrowSuccess}
      />
      
      {/* Book Details Modal */}
      <BookDetailsModal
        open={showDetailsModal}
        onClose={handleCloseDetails}
        book={selectedBook}
        onBorrow={handleSelectBook}
      />
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* Floating borrow button */}
      {selectedBooks.length > 0 && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
          onClick={handleOpenBorrowDialog}
        >
          <Badge badgeContent={selectedBooks.length} color="error">
            <ShoppingCartIcon />
          </Badge>
        </Fab>
      )}
    </Layout>
  );
};

export default BooksPage; 