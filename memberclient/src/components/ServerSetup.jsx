/**
 * Server Setup Component
 * Allows users to connect to a Balanghay server
 */
import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Alert, 
  CircularProgress,
  Grid,
  Divider
} from '@mui/material';
import { useServer } from '../context/ServerContext';
import { SERVER_CONFIG } from '../config/constants';
import WifiIcon from '@mui/icons-material/Wifi';
import ComputerIcon from '@mui/icons-material/Computer';

const ServerSetup = () => {
  const { 
    serverHost, 
    serverPort, 
    connected, 
    connecting, 
    error, 
    connectToServer,
    disconnectFromServer 
  } = useServer();
  
  const [host, setHost] = useState(serverHost || SERVER_CONFIG.DEFAULT_HOST);
  const [port, setPort] = useState(serverPort || SERVER_CONFIG.API_PORT);
  const [formError, setFormError] = useState('');
  
  /**
   * Handle form submission
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Validate input
    if (!host.trim()) {
      setFormError('Server host is required');
      return;
    }
    
    if (!port) {
      setFormError('Server port is required');
      return;
    }
    
    // Attempt to connect
    const result = await connectToServer(host, port);
    
    if (!result.success) {
      setFormError(result.error || 'Failed to connect to server');
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ComputerIcon sx={{ mr: 1 }} color="primary" />
        <Typography variant="h5" component="h2">
          Server Connection
        </Typography>
      </Box>
      
      {connected ? (
        <Box sx={{ mb: 3 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Connected to server at {serverHost}:{serverPort}
          </Alert>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={disconnectFromServer}
            startIcon={<WifiIcon />}
          >
            Disconnect
          </Button>
        </Box>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {formError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField
                label="Server Host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                fullWidth
                margin="normal"
                placeholder="localhost or IP address"
                disabled={connecting}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Port"
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || '')}
                fullWidth
                margin="normal"
                placeholder="3000"
                disabled={connecting}
                required
              />
            </Grid>
          </Grid>
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={connecting}
            sx={{ mt: 2 }}
            startIcon={connecting ? <CircularProgress size={20} color="inherit" /> : <WifiIcon />}
          >
            {connecting ? 'Connecting...' : 'Connect to Server'}
          </Button>
        </form>
      )}
    </Paper>
  );
};

export default ServerSetup; 