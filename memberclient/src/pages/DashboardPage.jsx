/**
 * Dashboard Page
 * Home page for authenticated members
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../components/Dashboard';
import { useAuth } from '../context/AuthContext';
import { useServer } from '../context/ServerContext';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import WifiOffIcon from '@mui/icons-material/WifiOff';

const DashboardPage = () => {
  const { isAuthenticated, loading, isSessionValid } = useAuth();
  const { connected, hasRecentConnection } = useServer();
  const navigate = useNavigate();
  
  // Redirect to login if not authenticated or if session expired
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !isSessionValid()) {
        navigate('/login');
      } else if (!connected && !hasRecentConnection()) {
        // If session is valid but server connection is lost, go back to setup
        navigate('/login');
      }
    }
  }, [isAuthenticated, loading, navigate, connected, isSessionValid]);
  
  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <Layout>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: '80vh', 
            flexDirection: 'column'
          }}
        >
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading your account...
          </Typography>
        </Box>
      </Layout>
    );
  }
  
  // Show unauthorized message if somehow not authenticated
  if (!isAuthenticated || !isSessionValid()) {
    return (
      <Layout>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            maxWidth: 600, 
            mx: 'auto', 
            mt: 8,
            textAlign: 'center' 
          }}
        >
          <Typography variant="h5" component="h1" color="error" sx={{ mb: 2 }}>
            Access Denied
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Your session has expired or you're not logged in.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/login')}
            startIcon={<PersonAddIcon />}
          >
            Go to Login
          </Button>
        </Paper>
      </Layout>
    );
  }
  
  // Show server disconnected message if server connection is lost
  if (!connected && !hasRecentConnection()) {
    return (
      <Layout>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            maxWidth: 600, 
            mx: 'auto', 
            mt: 8,
            textAlign: 'center' 
          }}
        >
          <Typography variant="h5" component="h1" color="error" sx={{ mb: 2 }}>
            Server Connection Lost
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            The connection to the server has been lost. Please reconnect.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/login')}
            startIcon={<WifiOffIcon />}
          >
            Reconnect
          </Button>
        </Paper>
      </Layout>
    );
  }
  
  // Render dashboard if authenticated
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
};

export default DashboardPage; 