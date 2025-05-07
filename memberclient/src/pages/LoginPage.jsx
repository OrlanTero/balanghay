/**
 * Login Page
 * Page for member authentication
 */
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import Login from '../components/Login';
import ServerSetup from '../components/ServerSetup';
import { useServer } from '../context/ServerContext';
import { useAuth } from '../context/AuthContext';
import { Box, Paper, Typography, Divider, Button } from '@mui/material';

const LoginPage = () => {
  const { connected, hasRecentConnection } = useServer();
  const { isAuthenticated, isSessionValid } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // If user is already authenticated and has a valid session, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && isSessionValid() && (connected || hasRecentConnection())) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, connected, navigate, isSessionValid, hasRecentConnection]);
  
  // Determine if we should show the server setup form
  const isSetupPage = location.pathname === '/setup';
  const showServerSetup = isSetupPage || (!connected && !hasRecentConnection());
  
  return (
    <Layout>
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
        {/* Show server setup if not connected or explicitly on setup page */}
        {showServerSetup ? (
          <ServerSetup />
        ) : (
          <>
            <Login />
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                mt: 3, 
                bgcolor: 'info.light',
                color: 'info.contrastText'
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Welcome to the Balanghay Member Portal
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">
                Please enter your email and PIN to access your account and view your borrowed items.
                If you've forgotten your PIN, please contact the library staff for assistance.
              </Typography>
            </Paper>
          </>
        )}
      </Box>
    </Layout>
  );
};

export default LoginPage; 