/**
 * Transactions Page
 * Displays member's loans and checkout history
 */
import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Divider, 
  Tabs, 
  Tab, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar,
  Chip,
  CircularProgress,
  Button,
  Alert
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HistoryIcon from '@mui/icons-material/History';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LayersIcon from '@mui/icons-material/Layers';
import AssignmentReturnedIcon from '@mui/icons-material/AssignmentReturned';
import Layout from '../components/Layout';
import ReturnBooksDialog from '../components/ReturnBooksDialog';
import { useAuth } from '../context/AuthContext';
import { getMemberLoans } from '../services/apiService';

// Format date to a human-readable string
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid Date';
  }
};

// Check if a date is in the past
const isPastDue = (dateString) => {
  if (!dateString) return false;
  try {
    const dueDate = new Date(dateString);
    const today = new Date();
    return dueDate < today;
  } catch (e) {
    console.error('Error checking due date:', e);
    return false;
  }
};

const TransactionsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { member } = useAuth();
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const refreshLoans = async () => {
    if (!member?.id) return;
    
    try {
      setLoading(true);
      const response = await getMemberLoans(member.id);
      setLoans(Array.isArray(response) ? response : []);
      setError(null);
    } catch (err) {
      console.error('Error refreshing loans:', err);
      setError('Failed to refresh your transactions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch member's loans
    const fetchLoans = async () => {
      if (!member?.id) {
        setLoading(false);
        setError('Member information not available.');
        return;
      }
      
      try {
        setLoading(true);
        const response = await getMemberLoans(member.id);
        // getMemberLoans now returns empty array on error instead of throwing
        setLoans(Array.isArray(response) ? response : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching loans:', err);
        setError('Failed to load your transactions. Please try again later.');
        setLoans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, [member]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Get active and past loans (safely)
  const activeLoans = Array.isArray(loans) 
    ? loans.filter(loan => loan && loan.status !== 'Returned') 
    : [];
  
  const pastLoans = Array.isArray(loans) 
    ? loans.filter(loan => loan && loan.status === 'Returned') 
    : [];

  // Handler for successful book return
  const handleReturnSuccess = () => {
    refreshLoans();
  };

  // Handle opening the return dialog for a specific loan
  const handleOpenReturnDialog = (loan) => {
    setSelectedLoan(loan);
    setOpenReturnDialog(true);
  };

  // Handle closing the return dialog
  const handleCloseReturnDialog = () => {
    setOpenReturnDialog(false);
    setSelectedLoan(null);
  };

  // Render a loan item
  const renderLoanItem = (loan) => {
    if (!loan) return null;
    
    const isOverdue = isPastDue(loan.due_date) && loan.status !== 'Returned';
    const isBatch = loan.is_batch;
    const isActive = loan.status !== 'Returned';
    
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          mb: 2, 
          p: 2,
          borderLeft: isOverdue ? '4px solid #f44336' : null 
        }}
        key={loan.id || Math.random()}
      >
        <ListItem alignItems="flex-start" sx={{ px: 0 }}>
          <ListItemAvatar>
            <Avatar 
              sx={{ 
                bgcolor: isBatch ? 'secondary.main' : 'primary.main'
              }}
            >
              {isBatch ? <LayersIcon /> : <MenuBookIcon />}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography variant="subtitle1" fontWeight="medium">
                {loan.book_title || (isBatch ? 'Multiple Books' : 'Unknown Book')}
                {isOverdue && (
                  <Chip 
                    icon={<WarningIcon />} 
                    label="Overdue" 
                    color="error" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                )}
                {loan.status === 'Returned' && (
                  <Chip 
                    icon={<CheckCircleIcon />} 
                    label="Returned" 
                    color="success" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
            }
            secondary={
              <React.Fragment>
                {isBatch ? (
                  <Typography variant="body2" color="text.secondary">
                    {loan.total_books || 'Multiple'} books in this transaction
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {loan.book_author ? `Author: ${loan.book_author}` : '\u00A0'}
                  </Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" component="span">
                    Checkout: {formatDate(loan.checkout_date)}
                  </Typography>
                  <Typography variant="body2" component="span" sx={{ mx: 2 }}>
                    •
                  </Typography>
                  <Typography 
                    variant="body2" 
                    component="span" 
                    color={isOverdue ? 'error' : 'text.secondary'}
                    fontWeight={isOverdue ? 'bold' : 'regular'}
                  >
                    Due: {formatDate(loan.due_date)}
                  </Typography>
                  {loan.return_date && (
                    <>
                      <Typography variant="body2" component="span" sx={{ mx: 2 }}>
                        •
                      </Typography>
                      <Typography variant="body2" component="span" color="success.main">
                        Returned: {formatDate(loan.return_date)}
                      </Typography>
                    </>
                  )}
                </Box>
                
                {isActive && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<AssignmentReturnedIcon />}
                      onClick={() => handleOpenReturnDialog(loan)}
                    >
                      Return
                    </Button>
                  </Box>
                )}
              </React.Fragment>
            }
          />
        </ListItem>
      </Paper>
    );
  };

  // Render the empty state
  const renderEmptyState = (message) => (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        textAlign: 'center', 
        my: 4, 
        bgcolor: 'info.light',
        color: 'info.contrastText'
      }}
    >
      <Typography variant="h6">
        {message}
      </Typography>
    </Paper>
  );

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Your Transactions
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          View your current and past book checkouts.
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab label="Current Loans" icon={<MenuBookIcon />} iconPosition="start" />
          <Tab label="Checkout History" icon={<HistoryIcon />} iconPosition="start" />
        </Tabs>
        
        {/* Tab panels */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Current Loans Tab */}
            <Box role="tabpanel" hidden={activeTab !== 0}>
              {activeTab === 0 && (
                <List sx={{ width: '100%' }}>
                  {activeLoans.length > 0 ? (
                    activeLoans.map(renderLoanItem)
                  ) : (
                    renderEmptyState("You don't have any current loans. Visit our library to borrow books!")
                  )}
                </List>
              )}
            </Box>
            
            {/* Checkout History Tab */}
            <Box role="tabpanel" hidden={activeTab !== 1}>
              {activeTab === 1 && (
                <List sx={{ width: '100%' }}>
                  {pastLoans.length > 0 ? (
                    pastLoans.map(renderLoanItem)
                  ) : (
                    renderEmptyState("You don't have any checkout history yet.")
                  )}
                </List>
              )}
            </Box>
          </>
        )}
      </Box>
      
      {/* Return Books Dialog */}
      <ReturnBooksDialog
        open={openReturnDialog}
        onClose={handleCloseReturnDialog}
        onSuccess={handleReturnSuccess}
        preselectedLoan={selectedLoan}
      />
    </Layout>
  );
};

export default TransactionsPage; 