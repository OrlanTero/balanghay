import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Chip,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Tooltip,
  Avatar,
  Card,
  CardContent,
  Stack,
  Badge,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Close,
  Edit,
  Delete,
  Add,
  Info,
  Book,
  BookmarkBorder,
  Bookmark,
  LibraryBooks,
  LocationOn,
  Category,
  Numbers,
  AccessTime,
  MenuBook,
  Store,
  CalendarToday,
  Description,
} from "@mui/icons-material";
import BookCopiesInfo from "./BookCopiesInfo";
import BookActions from "./BookActions";
import BookCopyForm from "./BookCopyForm";
import MultipleCopiesForm from "./MultipleCopiesForm";

const BookDetails = ({ bookId, onClose, onEdit, onDelete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState(null);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [openCopyForm, setOpenCopyForm] = useState(false);
  const [openMultipleCopiesForm, setOpenMultipleCopiesForm] = useState(false);
  const [selectedCopyId, setSelectedCopyId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        const data = await window.api.getBookById(bookId);
        
        // Get availability information for this book
        try {
          const availability = await window.api.getBookAvailability(bookId);
          data.copiesInfo = {
            total: availability.total_copies || 0,
            available: availability.available_copies || 0,
            checkedOut: availability.checked_out_copies || 0,
            damaged: availability.damaged_copies || 0
          };
        } catch (err) {
          console.error("Error fetching book availability:", err);
          data.copiesInfo = { total: 0, available: 0, checkedOut: 0, damaged: 0 };
        }
        
        setBook(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching book details:", err);
        setError("Failed to load book details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      fetchBookDetails();
    }
  }, [bookId, refreshTrigger]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBorrowCopy = (copyId) => {
    // Redirect to loan management with the specific copy ID
    if (window.location.hash !== "#/loan-management") {
      window.location.hash = "#/loan-management";
    }

    // Store the copy ID in localStorage so loan management can access it
    localStorage.setItem("selectedBookCopyId", copyId);
    localStorage.setItem("redirectToBorrow", "true");
    console.log(`Preparing to borrow copy with ID: ${copyId}`);

    // Close the book details dialog
    onClose();
  };

  const handleAddCopy = () => {
    setSelectedCopyId(null);
    setOpenCopyForm(true);
  };

  const handleEditCopy = (copyId) => {
    setSelectedCopyId(copyId);
    setOpenCopyForm(true);
  };

  const handleAddMultipleCopies = () => {
    setOpenMultipleCopiesForm(true);
  };

  const handleCloseCopyForm = () => {
    setOpenCopyForm(false);
    setSelectedCopyId(null);
  };

  const handleCloseMultipleCopiesForm = () => {
    setOpenMultipleCopiesForm(false);
  };

  const handleSaveCopy = () => {
    handleCloseCopyForm();
    // Refresh the data
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSaveMultipleCopies = () => {
    handleCloseMultipleCopiesForm();
    // Refresh the data
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <Dialog open={true} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          py: 1.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <MenuBook sx={{ mr: 1 }} />
            <Typography variant="h6">Book Details</Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8, color: 'primary.contrastText' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: '300px' }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>Loading book details...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={true} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          py: 1.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <MenuBook sx={{ mr: 1 }} />
            <Typography variant="h6">Book Details</Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8, color: 'primary.contrastText' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" variant="filled" sx={{ mb: 2 }}>{error}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!book) {
    return (
      <Dialog open={true} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          py: 1.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <MenuBook sx={{ mr: 1 }} />
            <Typography variant="h6">Book Details</Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8, color: 'primary.contrastText' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>No book information available.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Function to render availability status with icons
  const renderAvailabilityStats = () => {
    if (!book.copiesInfo || book.copiesInfo.total === 0) {
      return (
        <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
          No copies available in the library
        </Alert>
      );
    }

    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: 2, 
        mt: 2,
        width: '100%'
      }}>
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 2, boxShadow: theme.shadows[1] }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: '0.875rem' }}>
              Total Copies
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {book.copiesInfo.total}
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ 
          flex: 1, 
          borderRadius: 2, 
          bgcolor: 'success.light',
          boxShadow: theme.shadows[1]
        }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h6" color="success.contrastText" gutterBottom sx={{ fontSize: '0.875rem' }}>
              Available
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.contrastText' }}>
              {book.copiesInfo.available}
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ 
          flex: 1, 
          borderRadius: 2, 
          bgcolor: 'warning.light',
          boxShadow: theme.shadows[1]
        }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.contrastText" gutterBottom sx={{ fontSize: '0.875rem' }}>
              Checked Out
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'warning.contrastText' }}>
              {book.copiesInfo.checkedOut}
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ 
          flex: 1, 
          borderRadius: 2, 
          bgcolor: book.copiesInfo.damaged > 0 ? 'error.light' : 'grey.100',
          boxShadow: theme.shadows[1]
        }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography 
              variant="h6" 
              color={book.copiesInfo.damaged > 0 ? 'error.contrastText' : 'text.secondary'} 
              gutterBottom 
              sx={{ fontSize: '0.875rem' }}
            >
              Damaged
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold', 
                color: book.copiesInfo.damaged > 0 ? 'error.contrastText' : 'text.secondary'
              }}
            >
              {book.copiesInfo.damaged}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Dialog 
      open={true} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '80vh',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MenuBook sx={{ mr: 1 }} />
          <Typography variant="h6">Book Details</Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8, color: 'primary.contrastText' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Grid container>
          {/* Top section with book details */}
          <Grid item xs={12} sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Grid container spacing={3}>
              {/* Book Cover Section */}
              <Grid item xs={12} md={4} lg={3}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%', 
                  alignItems: 'center'
                }}>
                  {/* Book Cover */}
                  {book.front_cover ? (
                    <Paper 
                      elevation={3} 
                      sx={{ 
                        p: 1, 
                        borderRadius: 2, 
                        width: '100%', 
                        maxWidth: 250,
                        mx: 'auto',
                        mb: 2
                      }}
                    >
                      <Box
                        component="img"
                        src={book.front_cover}
                        alt={`Cover for ${book.title}`}
                        sx={{
                          width: "100%",
                          borderRadius: 1,
                          aspectRatio: '2/3',
                          objectFit: "cover",
                        }}
                      />
                    </Paper>
                  ) : (
                    <Paper 
                      elevation={3} 
                      sx={{ 
                        borderRadius: 2, 
                        width: '100%', 
                        maxWidth: 250, 
                        mx: 'auto',
                        mb: 2
                      }}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          aspectRatio: '2/3',
                          bgcolor: book.cover_color || "#6B4226",
                          borderRadius: 1,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          color: "#fff",
                          p: 2
                        }}
                      >
                        <Typography
                          variant="h5"
                          sx={{
                            textAlign: "center",
                            fontWeight: "bold",
                          }}
                        >
                          {book.title}
                        </Typography>
                      </Box>
                    </Paper>
                  )}
                  
                  {/* Action Buttons */}
                  <Box sx={{ width: '100%', maxWidth: 250, mt: 'auto' }}>
                    <BookActions
                      book={book}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAddCopy={handleAddCopy}
                      onAddMultipleCopies={handleAddMultipleCopies}
                    />
                  </Box>
                </Box>
              </Grid>

              {/* Book Details Section */}
              <Grid item xs={12} md={8} lg={9}>
                {/* Title, Author, and Quick Info */}
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'primary.main',
                    lineHeight: 1.2,
                    mb: 1
                  }}
                >
                  {book.title}
                </Typography>

                <Typography 
                  variant="h6" 
                  color="text.secondary" 
                  gutterBottom
                  sx={{ mb: 2 }}
                >
                  by {book.author}
                </Typography>
                
                {/* Key Metadata */}
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: 1, 
                  mb: 3 
                }}>
                  {book.category && (
                    <Chip
                      icon={<Category fontSize="small" />}
                      label={book.category}
                      color="primary"
                      variant="filled"
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                  
                  {book.isbn && (
                    <Chip
                      icon={<Numbers fontSize="small" />}
                      label={`ISBN: ${book.isbn}`}
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                  
                  {book.publish_year && (
                    <Chip
                      icon={<CalendarToday fontSize="small" />}
                      label={`Published: ${book.publish_year}`}
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                </Box>
                
                {/* Book Details Grid */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {/* Book Details Items */}
                  {book.publisher && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Store color="action" fontSize="small" sx={{ mt: 0.5, mr: 1 }} />
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Publisher</Typography>
                          <Typography variant="body1">{book.publisher}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                  
                  {/* Additional book metadata can go here */}
                  {/* For example: language, pages, format, edition */}
                  {book.language && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Info color="action" fontSize="small" sx={{ mt: 0.5, mr: 1 }} />
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Language</Typography>
                          <Typography variant="body1">{book.language}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                  
                  {book.pages && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <MenuBook color="action" fontSize="small" sx={{ mt: 0.5, mr: 1 }} />
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Pages</Typography>
                          <Typography variant="body1">{book.pages}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
                
                {/* Availability Stats */}
                <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <Book sx={{ mr: 1 }} fontSize="small" />
                  Availability Status
                </Typography>
                
                {renderAvailabilityStats()}
              </Grid>
              
              {/* Description Section (Full Width) */}
              {book.description && (
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <Description fontSize="small" sx={{ mr: 1 }} />
                      Description
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ lineHeight: 1.7 }}>
                      {book.description}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Grid>
          
          {/* Tab Section */}
          <Grid item xs={12} sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ width: '100%' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{
                  width: '100%',
                  bgcolor: 'background.paper',
                  borderBottom: 1,
                  borderColor: 'divider',
                  "& .MuiTab-root": {
                    fontWeight: "bold",
                    py: 2,
                    maxWidth: 'none',
                  },
                }}
              >
                <Tab 
                  label="Copies & Availability" 
                  icon={<Book />} 
                  iconPosition="start"
                  sx={{ flexGrow: 1 }}
                />
                <Tab 
                  label="Loan History" 
                  icon={<LibraryBooks />} 
                  iconPosition="start"
                  sx={{ flexGrow: 1 }}
                />
              </Tabs>

              <Box sx={{ 
                p: 3, 
                bgcolor: 'background.default',
                width: '100%' 
              }}>
                {tabValue === 0 ? (
                  <Box sx={{ width: '100%' }}>
                    <BookCopiesInfo
                      bookId={bookId}
                      onBorrowCopy={handleBorrowCopy}
                      onEditCopy={handleEditCopy}
                      refreshKey={refreshTrigger}
                    />
                  </Box>
                ) : (
                  <Paper 
                    elevation={0} 
                    variant="outlined" 
                    sx={{ 
                      p: 3, 
                      borderRadius: 2,
                      width: '100%'
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Loan History
                    </Typography>
                    <Alert severity="info" icon={<Info />}>
                      Loan history feature coming soon.
                    </Alert>
                  </Paper>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button 
          onClick={onClose} 
          variant="outlined" 
          color="primary"
          size="large"
          sx={{ borderRadius: 1.5 }}
        >
          Close
        </Button>
      </DialogActions>

      {/* Single Copy Form Dialog */}
      {openCopyForm && (
        <BookCopyForm
          open={openCopyForm}
          bookId={bookId}
          copyId={selectedCopyId}
          onClose={handleCloseCopyForm}
          onSave={handleSaveCopy}
        />
      )}

      {/* Multiple Copies Form Dialog */}
      {openMultipleCopiesForm && (
        <MultipleCopiesForm
          open={openMultipleCopiesForm}
          bookId={bookId}
          onClose={handleCloseMultipleCopiesForm}
          onSave={handleSaveMultipleCopies}
        />
      )}
    </Dialog>
  );
};

export default BookDetails;
