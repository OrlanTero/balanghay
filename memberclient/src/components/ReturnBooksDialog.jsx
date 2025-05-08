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

const ReturnBooksDialog = ({ open, onClose, onSuccess, preselectedLoan, preloadedLoanIds = [] }) => {
  const { member } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [returning, setReturning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loans, setLoans] = useState([]);
  const [selectedLoans, setSelectedLoans] = useState({});
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
        if (!selectedLoans[matchingLoan.id]) {
          setSelectedLoans({
            ...selectedLoans,
            [matchingLoan.id]: {
              loanId: matchingLoan.id,
              returnCondition: 'Good',
              note: ''
            }
          });
        }
      }
    }
  }, [open, preselectedLoan, loans]);
  
  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedLoans({});
      setError(null);
      setSuccess(null);
      setQrInput('');
      setActiveTab(0);
    }
  }, [open]);
  
  // Add this useEffect to handle preloaded loan IDs
  useEffect(() => {
    // Create a flag to track if we've already processed the preloaded IDs
    const shouldProcessPreloadedIds = open && 
      preloadedLoanIds.length > 0 && 
      Object.keys(selectedLoans).length === 0 && 
      member?.id && 
      loans.length > 0;
    
    // Log every time the effect is triggered
    console.log('ReturnBooksDialog preloadedLoanIds effect triggered:', { 
      open, 
      preloadedLoanIds: preloadedLoanIds.length > 0 ? `${preloadedLoanIds.length} IDs` : 'none',
      memberPresent: !!member?.id,
      loansLoaded: loans.length,
      shouldProcess: shouldProcessPreloadedIds,
      alreadySelected: Object.keys(selectedLoans).length > 0
    });
    
    if (shouldProcessPreloadedIds) {
      // Only process preloaded loan IDs if:
      // 1. Dialog is open
      // 2. We have preloaded IDs
      // 3. No loans are already selected (to prevent double processing)
      // 4. Member is logged in
      // 5. Loans are loaded
      console.log('Processing preloaded loan IDs:', preloadedLoanIds);
      
      const newSelectedLoans = {};
      
      console.log('Matching preloaded IDs against loaded loans:', {
        preloadedIds: preloadedLoanIds,
        availableLoans: loans.map(loan => ({ id: loan.id, status: loan.status, returned: !!loan.return_date }))
      });
      
      // Match preloaded loan IDs with actual loans
      loans.forEach(loan => {
        if (preloadedLoanIds.includes(loan.id) && !loan.return_date) {
          console.log('Found matching active loan for preloaded ID:', loan.id);
          newSelectedLoans[loan.id] = {
            loanId: loan.id,
            returnCondition: 'Good',
            note: 'Returned via QR code scan'
          };
        }
      });
      
      if (Object.keys(newSelectedLoans).length > 0) {
        console.log('Setting selected loans:', newSelectedLoans);
        setSelectedLoans(newSelectedLoans);
      } else {
        console.warn('No active loans matched the preloaded IDs!');
        setError('No active loans found matching the QR code data. They may have already been returned.');
      }
    }
  }, [open, preloadedLoanIds, member?.id, loans]);
  
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
    if (!loan || !loan.id) return;
    
    // Skip already returned books
    if (loan.return_date || loan.status === 'Returned') {
      console.log('Cannot select already returned book:', loan.id);
      return;
    }
    
    setSelectedLoans(prev => {
      // Check if this loan is already selected
      const isSelected = Boolean(prev[loan.id]);
      
      if (isSelected) {
        // Remove from selected
        const newSelectedLoans = { ...prev };
        delete newSelectedLoans[loan.id];
        return newSelectedLoans;
      } else {
        // Add to selected with default values
        return {
          ...prev,
          [loan.id]: {
            loanId: loan.id,
            returnCondition: 'Good',
            note: ''
          }
        };
      }
    });
  };
  
  const handleConditionChange = (loanId, condition) => {
    setSelectedLoans(prev => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        returnCondition: condition
      }
    }));
  };
  
  const handleNoteChange = (loanId, note) => {
    setSelectedLoans(prev => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        note: note
      }
    }));
  };
  
  const handleReturnBooks = async () => {
    if (Object.keys(selectedLoans).length === 0) {
      setError('Please select at least one book to return.');
      return;
    }
    
    setReturning(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Make sure we have valid loan IDs
      if (!Object.values(selectedLoans).some(loan => loan.loanId)) {
        console.error('Invalid loan data: No valid loan IDs found', selectedLoans);
        setError('Cannot return books: Missing loan IDs');
        setReturning(false);
        return;
      }
      
      // Format data for the API
      const returnData = {
        returns: Object.values(selectedLoans).map(loan => ({
          loanId: Number(loan.loanId),
          returnCondition: loan.returnCondition || 'Good',
          note: loan.note || ''
        }))
      };
      
      console.log('Return data:', returnData);
      
      // Call the API to process returns
      const result = await returnBooks(returnData);
      
      if (result.success) {
        setSuccess(`Successfully returned ${Object.keys(selectedLoans).length} book(s).`);
        setSelectedLoans({});
        
        // Refresh loans list
        await fetchMemberLoans();
        
        // Notify parent component of success
        if (onSuccess) {
          onSuccess(result);
        }
        
        // Close dialog after successful return
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Failed to return books. Please try again.');
      }
    } catch (error) {
      console.error('Error returning books:', error);
      setError('An error occurred while returning books. Please try again.');
    } finally {
      setReturning(false);
    }
  };
  
  const handleProcessQR = async () => {
    if (!qrInput.trim()) {
      setError('Please enter a QR code or loan ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      let processedInput = qrInput.trim();
      let loanIds = [];
      
      // Check if input is a valid JSON
      if (processedInput.startsWith('{') || processedInput.startsWith('[')) {
        try {
          const jsonData = JSON.parse(processedInput);
          
          // Check for different JSON structures
          if (jsonData.l && Array.isArray(jsonData.l)) {
            // Format { l: [id1, id2] }
            loanIds = jsonData.l.map(id => Number(id));
          } else if (jsonData.loan_ids && Array.isArray(jsonData.loan_ids)) {
            // Format { loan_ids: [id1, id2] }
            loanIds = jsonData.loan_ids.map(id => Number(id));
          } else if (jsonData.loansIds && Array.isArray(jsonData.loansIds)) {
            // Format { loansIds: [id1, id2] }
            loanIds = jsonData.loansIds.map(id => Number(id));
          } else if (jsonData.id) {
            // Single loan ID
            loanIds = [Number(jsonData.id)];
          } else if (jsonData.loanId) {
            // Single loan ID
            loanIds = [Number(jsonData.loanId)];
          }
        } catch (e) {
          console.error('Error parsing QR JSON:', e);
          // Not valid JSON, continue with text processing
        }
      }
      
      // If not parsed as JSON, try as comma-separated list or single number
      if (loanIds.length === 0) {
        if (processedInput.includes(',')) {
          // Comma-separated list
          loanIds = processedInput.split(',')
            .map(id => id.trim())
            .filter(id => /^\d+$/.test(id))
            .map(id => Number(id));
        } else if (/^\d+$/.test(processedInput)) {
          // Single number
          loanIds = [Number(processedInput)];
        }
      }
      
      if (loanIds.length === 0) {
        throw new Error('Could not find any valid loan IDs in the QR code');
      }
      
      console.log('Extracted loan IDs:', loanIds);
      
      // Match loan IDs with actual loans and select them
      const matchedLoans = loans.filter(loan => 
        loanIds.includes(loan.id) && 
        !loan.return_date && 
        loan.status !== 'Returned'
      );
      
      if (matchedLoans.length === 0) {
        throw new Error('No active loans found matching the QR code data');
      }
      
      console.log('Matched loans:', matchedLoans);
      
      // Select the matched loans
      const newSelectedLoans = {};
      
      matchedLoans.forEach(loan => {
        newSelectedLoans[loan.id] = {
          loanId: loan.id,
          returnCondition: 'Good',
          note: 'Returned via QR code'
        };
      });
      
      setSelectedLoans(newSelectedLoans);
      setSuccess(`Found ${matchedLoans.length} loan(s) to return`);
      setActiveTab(0); // Switch to manual tab to show the selected loans
    } catch (error) {
      console.error('Error processing QR code:', error);
      setError(error.message || 'Failed to process QR code');
    } finally {
      setLoading(false);
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
              border: selectedLoans[loan.id] ? '2px solid #1976d2' : 'none',
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
                        checked={selectedLoans[loan.id]} 
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
              
              {selectedLoans[loan.id] && (
                <Grid item xs={12} md={5}>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Condition</InputLabel>
                    <Select
                      value={selectedLoans[loan.id]?.returnCondition || 'Good'}
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
                    value={selectedLoans[loan.id]?.note || ''}
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
        
        {Object.keys(selectedLoans).length > 0 && (
          <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {Object.keys(selectedLoans).length} book(s) selected for return
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
              {Object.keys(selectedLoans).length} book(s) selected
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
            disabled={returning || Object.keys(selectedLoans).length === 0}
          >
            {returning ? 'Processing...' : 'Return Selected Books'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ReturnBooksDialog; 