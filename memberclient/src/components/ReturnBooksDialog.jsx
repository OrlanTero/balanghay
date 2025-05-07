import React, { useState, useEffect } from 'react';
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
  Checkbox,
  FormControlLabel,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  AssignmentReturned as ReturnIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { returnBooks, getMemberLoans } from '../services/apiService';

const ReturnBooksDialog = ({ open, onClose, onSuccess, preselectedLoan }) => {
  const { member } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [returning, setReturning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loans, setLoans] = useState([]);
  const [selectedLoans, setSelectedLoans] = useState([]);
  const [qrInput, setQrInput] = useState('');
  
  // Fetch member loans when dialog opens
  useEffect(() => {
    if (open && member) {
      fetchMemberLoans();
    }
  }, [open, member]);
  
  // Handle preselected loan when it's provided
  useEffect(() => {
    if (open && preselectedLoan && loans.length > 0) {
      // Check if the preselected loan exists in our loans list
      const matchingLoan = loans.find(loan => loan.id === preselectedLoan.id);
      if (matchingLoan) {
        // If the loan is not already selected, add it to selectedLoans
        if (!selectedLoans.some(loan => loan.id === matchingLoan.id)) {
          setSelectedLoans([{
            ...matchingLoan,
            returnCondition: 'Good',
            note: ''
          }]);
        }
      }
    }
  }, [open, preselectedLoan, loans]);
  
  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedLoans([]);
      setError(null);
      setSuccess(null);
      setQrInput('');
      setActiveTab(0);
    }
  }, [open]);
  
  const fetchMemberLoans = async () => {
    if (!member || !member.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching loans for member', member.id);
      const loansData = await getMemberLoans(member.id);
      
      // Log loan structure to debug format
      console.log('Raw loans data from API:', JSON.stringify(loansData, null, 2));
      
      // Filter to only get active (non-returned) loans
      const activeLoans = loansData.filter(loan => 
        loan.status === 'Borrowed' || loan.status === 'Checked Out'
      );
      
      console.log('Active loans:', activeLoans);
      console.log('First active loan sample (for structure):', activeLoans[0]);
      setLoans(activeLoans);
      
      if (activeLoans.length === 0) {
        setError('You have no active loans to return.');
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError('Failed to load your loans. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError(null);
    setSuccess(null);
  };
  
  const handleToggleLoan = (loan) => {
    setSelectedLoans(prev => {
      // Check if this loan is already selected
      const isSelected = prev.some(selectedLoan => selectedLoan.id === loan.id);
      
      if (isSelected) {
        // Remove from selected
        return prev.filter(selectedLoan => selectedLoan.id !== loan.id);
      } else {
        // Add to selected with default values
        return [...prev, {
          ...loan,
          returnCondition: 'Good',
          note: ''
        }];
      }
    });
  };
  
  const handleConditionChange = (loanId, condition) => {
    setSelectedLoans(prev => 
      prev.map(loan => 
        loan.id === loanId 
          ? { ...loan, returnCondition: condition } 
          : loan
      )
    );
  };
  
  const handleNoteChange = (loanId, note) => {
    setSelectedLoans(prev => 
      prev.map(loan => 
        loan.id === loanId 
          ? { ...loan, note } 
          : loan
      )
    );
  };
  
  const handleReturnBooks = async () => {
    if (selectedLoans.length === 0) {
      setError('Please select at least one book to return.');
      return;
    }
    
    setReturning(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Make sure we have valid loan IDs
      if (!selectedLoans.some(loan => loan.id)) {
        console.error('Invalid loan data: No valid loan IDs found', selectedLoans);
        setError('Cannot return books: Missing loan IDs');
        return;
      }
      
      // Log selected loans for debugging
      console.log('Selected loans for return:', selectedLoans);
      
      // Format data for the API - using loanId instead of loan_id to match server expectations
      const returnData = {
        returns: selectedLoans.map(loan => ({
          loanId: Number(loan.id),
          returnCondition: loan.returnCondition || 'Good',
          note: loan.note || ''
        }))
      };
      
      console.log('Returning books:', returnData);
      const result = await returnBooks(returnData);
      
      console.log('Return result:', result);
      
      if (result.success) {
        setSuccess(`Successfully returned ${selectedLoans.length} book(s).`);
        setSelectedLoans([]);
        
        // Refresh loans list
        fetchMemberLoans();
        
        // Call success callback
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        setError(result.message || 'Failed to return books. Please try again.');
      }
    } catch (err) {
      console.error('Error returning books:', err);
      setError(`Error: ${err.message || 'Failed to return books'}`);
    } finally {
      setReturning(false);
    }
  };
  
  const handleProcessQR = async () => {
    if (!qrInput.trim()) {
      setError('Please enter QR code data.');
      return;
    }
    
    setReturning(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Parse QR data
      let qrData;
      try {
        qrData = JSON.parse(qrInput);
      } catch (err) {
        // If it's not valid JSON, try using it as a raw loan ID
        if (/^\d+$/.test(qrInput.trim())) {
          qrData = { loansIds: [parseInt(qrInput.trim(), 10)] };
        } else {
          throw new Error('Invalid QR code format. Please scan a valid library receipt QR code.');
        }
      }
      
      console.log('Processed QR data:', qrData);
      
      // Check if it has loan IDs
      if (!qrData.loansIds || !Array.isArray(qrData.loansIds) || qrData.loansIds.length === 0) {
        throw new Error('No loan IDs found in QR code.');
      }
      
      // Format data for return, using loanId instead of loan_id
      const returnData = {
        returns: qrData.loansIds.map(loanId => ({
          loanId: Number(loanId),
          returnCondition: 'Good',
          note: 'Returned via QR code scan'
        }))
      };
      
      console.log('QR return data:', returnData);
      const result = await returnBooks(returnData);
      
      if (result.success) {
        setSuccess(`Successfully returned ${qrData.loansIds.length} book(s).`);
        setQrInput('');
        
        // Refresh loans list
        fetchMemberLoans();
        
        // Call success callback
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        setError(result.message || 'Failed to return books. Please try again.');
      }
    } catch (err) {
      console.error('Error processing QR code:', err);
      setError(`Error: ${err.message || 'Failed to process QR code'}`);
    } finally {
      setReturning(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };
  
  const isLoanOverdue = (loan) => {
    if (!loan.due_date) return false;
    const today = new Date();
    const dueDate = new Date(loan.due_date);
    return dueDate < today;
  };
  
  // Render the manual return tab
  const renderManualReturnTab = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (loans.length === 0) {
      return (
        <Alert severity="info" sx={{ my: 2 }}>
          You don't have any books to return at this time.
        </Alert>
      );
    }
    
    return (
      <>
        <Typography variant="subtitle1" gutterBottom>
          Select books to return:
        </Typography>
        
        {loans.map(loan => (
          <Paper 
            key={loan.id}
            elevation={2}
            sx={{ 
              mb: 2, 
              p: 2,
              border: selectedLoans.some(l => l.id === loan.id) ? '2px solid #1976d2' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => handleToggleLoan(loan)}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={selectedLoans.some(l => l.id === loan.id)} 
                        onChange={() => handleToggleLoan(loan)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                    label=""
                  />
                  <Box>
                    <Typography variant="subtitle1">{loan.book_title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      by {loan.book_author}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Borrowed: {formatDate(loan.checkout_date)}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color={isLoanOverdue(loan) ? 'error' : 'text.secondary'}
                      sx={{ fontWeight: isLoanOverdue(loan) ? 'bold' : 'normal' }}
                    >
                      Due: {formatDate(loan.due_date)}
                      {isLoanOverdue(loan) && ' (OVERDUE)'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              {selectedLoans.some(l => l.id === loan.id) && (
                <Grid item xs={12} md={5}>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Condition</InputLabel>
                    <Select
                      value={selectedLoans.find(l => l.id === loan.id)?.returnCondition || 'Good'}
                      onChange={(e) => handleConditionChange(loan.id, e.target.value)}
                      label="Condition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MenuItem value="Good">Good</MenuItem>
                      <MenuItem value="Damaged">Damaged</MenuItem>
                      <MenuItem value="Lost">Lost</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    fullWidth
                    size="small"
                    label="Notes (optional)"
                    value={selectedLoans.find(l => l.id === loan.id)?.note || ''}
                    onChange={(e) => handleNoteChange(loan.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    multiline
                    rows={2}
                  />
                </Grid>
              )}
            </Grid>
          </Paper>
        ))}
        
        {selectedLoans.length > 0 && (
          <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {selectedLoans.length} book(s) selected for return
            </Typography>
          </Paper>
        )}
      </>
    );
  };
  
  // Render the QR code tab
  const renderQRTab = () => {
    return (
      <Box sx={{ my: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Enter the QR code data from your receipt:
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Scan the QR code from your receipt or enter the loan ID manually.
        </Typography>
        
        <TextField
          fullWidth
          multiline
          rows={4}
          label="QR Code Data or Loan ID"
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value)}
          variant="outlined"
          placeholder="Paste QR code data here or enter loan ID"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <QrCodeScannerIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleProcessQR}
          disabled={returning || !qrInput.trim()}
          startIcon={returning ? <CircularProgress size={20} /> : <ReturnIcon />}
        >
          {returning ? 'Processing...' : 'Return Books'}
        </Button>
        
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle2">QR Code Tips:</Typography>
          <ul>
            <li>You can scan the QR code from your borrowing receipt</li>
            <li>If you don't have the QR code, you can enter the loan ID number directly</li>
            <li>To return multiple books, select them manually from the "My Loans" tab</li>
          </ul>
        </Alert>
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
          <Typography variant="h6">Return Books</Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="My Loans" />
        <Tab label="Scan QR Code" />
      </Tabs>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        {activeTab === 0 && renderManualReturnTab()}
        {activeTab === 1 && renderQRTab()}
      </DialogContent>
      
      {activeTab === 0 && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Box sx={{ mr: 'auto' }}>
            <Typography variant="body2" color="text.secondary">
              {selectedLoans.length} book(s) selected
            </Typography>
          </Box>
          <Button onClick={onClose} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={returning ? <CircularProgress size={20} /> : <ReturnIcon />}
            onClick={handleReturnBooks}
            disabled={returning || selectedLoans.length === 0}
          >
            {returning ? 'Processing...' : 'Return Selected Books'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ReturnBooksDialog; 