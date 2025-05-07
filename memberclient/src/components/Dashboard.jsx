/**
 * Dashboard Component
 * Main component for authenticated members
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useServer } from '../context/ServerContext';
import { getMemberLoans, getMemberStats } from '../services/apiService';
import BookIcon from '@mui/icons-material/Book';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LogoutIcon from '@mui/icons-material/Logout';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReturnBooksDialog from './ReturnBooksDialog';

const Dashboard = () => {
  const { member, logout } = useAuth();
  const { serverHost, serverPort } = useServer();
  const [stats, setStats] = useState({
    totalLoans: 0,
    activeLoans: 0,
    overdueLoans: 0,
    returnedLoans: 0
  });
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  
  // Fetch member data on component mount
  useEffect(() => {
    if (!member || !member.id) {
      setLoading(false);
      return;
    }
    
    const fetchMemberData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch member loans first (this is more likely to succeed)
        try {
          const loansResponse = await getMemberLoans(member.id);
          if (loansResponse && Array.isArray(loansResponse)) {
            setLoans(loansResponse);
          } else if (loansResponse && loansResponse.loans && Array.isArray(loansResponse.loans)) {
            setLoans(loansResponse.loans);
          } else {
            setLoans([]);
          }
        } catch (loansErr) {
          console.error('Error fetching loans:', loansErr);
          setLoans([]);
        }
        
        // Try to fetch stats (but continue if it fails)
        try {
          const statsResponse = await getMemberStats(member.id);
          if (statsResponse && statsResponse.stats) {
            setStats(statsResponse.stats);
          }
        } catch (statsErr) {
          console.error('Error fetching stats:', statsErr);
          // Just continue with default stats
        }
      } catch (err) {
        console.error('Error fetching member data:', err);
        setError('Failed to load some member data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMemberData();
  }, [member]);
  
  // Format date string
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
      return 'Invalid date';
    }
  };
  
  // Check if a loan is overdue
  const isOverdue = (loan) => {
    if (!loan || loan.return_date) return false;
    try {
      const dueDate = new Date(loan.due_date);
      const today = new Date();
      return dueDate < today;
    } catch (e) {
      return false;
    }
  };

  // Get member name safely
  const getMemberName = () => {
    if (member?.name) return member.name;
    if (member?.first_name) return member.first_name;
    return 'Member';
  };
  
  // Add a handler for return books dialog
  const handleReturnBooksSuccess = (result) => {
    // Refresh loans and stats after successful return
    if (member && member.id) {
      setLoading(true);
      
      Promise.all([
        getMemberLoans(member.id)
          .then(response => {
            if (response && Array.isArray(response)) {
              setLoans(response);
            } else if (response && response.loans && Array.isArray(response.loans)) {
              setLoans(response.loans);
            }
          }),
        getMemberStats(member.id)
          .then(response => {
            if (response && response.stats) {
              setStats(response.stats);
            }
          })
      ])
      .catch(err => {
        console.error('Error refreshing data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
    }
  };
  
  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar
                sx={{ width: 60, height: 60, bgcolor: 'primary.dark', mr: 2 }}
              >
                <AccountCircleIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" component="h1">
                  Welcome, {getMemberName()}!
                </Typography>
                <Typography variant="subtitle1">
                  Connected to {serverHost}:{serverPort}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              color="error"
              onClick={logout}
              startIcon={<LogoutIcon />}
              sx={{ bgcolor: 'error.dark' }}
            >
              Logout
            </Button>
          </Paper>
        </Grid>
        
        {/* Loading state */}
        {loading && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          </Grid>
        )}
        
        {/* Error state */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}
        
        {/* Member information */}
        {!loading && (
          <>
            {/* Member details */}
            <Grid item xs={12} md={4}>
              <Card elevation={2}>
                <CardHeader
                  title="Member Information"
                  subheader={`Member ID: ${member?.id || 'N/A'}`}
                  avatar={
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <AccountCircleIcon />
                    </Avatar>
                  }
                />
                <Divider />
                <CardContent>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Name"
                        secondary={member?.name || (member?.first_name ? `${member.first_name} ${member.last_name || ''}` : 'N/A')}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Email" secondary={member?.email || 'N/A'} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Phone" secondary={member?.phone || 'N/A'} />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Member Since"
                        secondary={member?.created_at ? formatDate(member.created_at) : 'N/A'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Member statistics */}
            <Grid item xs={12} md={8}>
              <Card elevation={2}>
                <CardHeader
                  title="Activity Summary"
                  avatar={
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <MenuBookIcon />
                    </Avatar>
                  }
                />
                <Divider />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="primary">
                          {stats?.totalLoans || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Loans
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="info.main">
                          {stats?.activeLoans || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Loans
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="success.main">
                          {stats?.returnedLoans || stats?.totalLoans - stats?.activeLoans || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Returned Books
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="error.main">
                          {stats?.overdueLoans || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Overdue Items
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<MenuBookIcon />}
                      onClick={() => setOpenReturnDialog(true)}
                      disabled={stats?.activeLoans === 0}
                      sx={{ px: 3, py: 1 }}
                    >
                      Return Books
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Current loans */}
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardHeader
                  title="Current Loans"
                  avatar={
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <BookIcon />
                    </Avatar>
                  }
                />
                <Divider />
                <CardContent>
                  {Array.isArray(loans) && loans.length > 0 ? (
                    <List>
                      {loans.filter(loan => loan && loan.status !== 'Returned').map((loan) => (
                        <ListItem key={loan.id} alignItems="flex-start">
                          <ListItemIcon>
                            <Avatar 
                              sx={{ 
                                bgcolor: isOverdue(loan) ? 'error.light' : 'primary.light'
                              }}
                            >
                              <BookIcon />
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="subtitle1">
                                  {loan.book_title || 'Unknown Book'}
                                </Typography>
                                {isOverdue(loan) && (
                                  <Chip 
                                    icon={<WarningIcon />} 
                                    label="Overdue" 
                                    color="error" 
                                    size="small" 
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography component="span" variant="body2" color="text.primary">
                                  Due: {formatDate(loan.due_date)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Checked out: {formatDate(loan.checkout_date)}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        You don't have any active loans.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>
      <ReturnBooksDialog
        open={openReturnDialog}
        onClose={() => setOpenReturnDialog(false)}
        onSuccess={handleReturnBooksSuccess}
      />
    </Box>
  );
};

export default Dashboard; 