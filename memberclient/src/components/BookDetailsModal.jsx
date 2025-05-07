import React, { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import { styled } from '@mui/material/styles';

// Styled component for the 3D book
const BookCover3D = styled(Box)(({ theme, bgcolor }) => ({
  position: 'relative',
  width: '200px',
  height: '280px',
  transformStyle: 'preserve-3d',
  transform: 'rotateY(-30deg)',
  transition: 'transform 0.6s',
  margin: '30px auto',
  '&:hover': {
    transform: 'rotateY(0deg)',
  },
  '& .front': {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: bgcolor || theme.palette.primary.main,
    borderRadius: '2px',
    boxShadow: '5px 5px 20px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    transformStyle: 'preserve-3d',
    transform: 'translateZ(10px)',
    overflow: 'hidden',
  },
  '& .spine': {
    position: 'absolute',
    width: '20px',
    height: '100%',
    backgroundColor: bgcolor ? `rgba(${parseInt(bgcolor.slice(1, 3), 16)}, ${parseInt(bgcolor.slice(3, 5), 16)}, ${parseInt(bgcolor.slice(5, 7), 16)}, 0.8)` : theme.palette.primary.dark,
    transformStyle: 'preserve-3d',
    transform: 'rotateY(90deg) translateZ(100px) translateX(-10px)',
    left: '-10px',
    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.2)',
  },
  '& .back': {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: bgcolor ? `rgba(${parseInt(bgcolor.slice(1, 3), 16)}, ${parseInt(bgcolor.slice(3, 5), 16)}, ${parseInt(bgcolor.slice(5, 7), 16)}, 0.9)` : theme.palette.primary.light,
    borderRadius: '2px',
    boxShadow: '-5px 5px 20px rgba(0, 0, 0, 0.2)',
    transformStyle: 'preserve-3d',
    transform: 'translateZ(-10px)',
    backfaceVisibility: 'hidden',
  },
  '& .book-title': {
    color: '#fff',
    padding: theme.spacing(2),
    textAlign: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
  },
  '& .spine-title': {
    position: 'absolute',
    color: '#fff',
    width: '280px',
    height: '20px',
    transform: 'rotateZ(90deg) translateX(0px) translateY(-10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

const BookDetailsModal = ({ open, onClose, book, onBorrow }) => {
  const bookCoverRef = useRef(null);

  // Add mouse movement effect for 3D rotation
  useEffect(() => {
    if (!open || !bookCoverRef.current) return;

    const bookCover = bookCoverRef.current;
    
    const handleMouseMove = (e) => {
      const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
      bookCover.style.transform = `rotateY(${-xAxis}deg) rotateX(${yAxis}deg)`;
    };
    
    const container = bookCover.parentElement;
    container.addEventListener('mousemove', handleMouseMove);
    
    // Reset on mouse leave
    const handleMouseLeave = () => {
      bookCover.style.transform = 'rotateY(-30deg) rotateX(0deg)';
      bookCover.style.transition = 'transform 0.6s';
    };
    
    // Smooth entry on mouse enter
    const handleMouseEnter = () => {
      bookCover.style.transition = 'transform 0.3s';
    };
    
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseenter', handleMouseEnter);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [open]);

  if (!book) return null;
  
  const isAvailable = book.status === 'Available';
  const bookColor = book.cover_color || '#1976d2'; // default to primary color if none provided

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
          Book Details
        </Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* 3D Book View */}
          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'center', perspective: '1000px' }}>
            <Box sx={{ width: '100%', height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookCover3D ref={bookCoverRef} bgcolor={bookColor}>
                <Box className="front">
                  {book.front_cover ? (
                    <Box 
                      component="img" 
                      src={book.front_cover} 
                      alt={book.title || 'Book cover'} 
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <Typography className="book-title">
                      {book.title || 'Untitled Book'}
                    </Typography>
                  )}
                </Box>
                <Box className="spine">
                  <Typography className="spine-title">
                    {book.title || 'Untitled Book'}
                  </Typography>
                </Box>
                <Box className="back"></Box>
              </BookCover3D>
            </Box>
          </Grid>

          {/* Book Information */}
          <Grid item xs={12} md={7}>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              {book.title || 'Untitled Book'}
            </Typography>
            
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
              By {book.author || 'Unknown Author'}
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Category
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {book.category || 'Uncategorized'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={book.status || 'Unknown'} 
                  color={isAvailable ? 'success' : 'error'} 
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  ISBN
                </Typography>
                <Typography variant="body1">
                  {book.isbn || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Publication Year
                </Typography>
                <Typography variant="body1">
                  {book.publication_year || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Synopsis
            </Typography>
            <Typography variant="body1" paragraph sx={{ mb: 3 }}>
              {book.description || 'No description available for this book.'}
            </Typography>
            
            {book.tags && book.tags.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {book.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" />
                  ))}
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<LibraryAddIcon />}
          disabled={!isAvailable}
          onClick={() => {
            onBorrow(book);
            onClose();
          }}
        >
          {isAvailable ? 'Borrow this Book' : 'Currently Unavailable'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookDetailsModal; 