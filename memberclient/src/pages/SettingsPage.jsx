/**
 * Settings Page
 * Allows users to view and update settings
 */
import React, { useState } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Divider, 
  TextField, 
  Button, 
  Alert,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Switch,
  FormControlLabel
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import WifiIcon from '@mui/icons-material/Wifi';
import StorageIcon from '@mui/icons-material/Storage';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useServer } from '../context/ServerContext';
import { SERVER_CONFIG } from '../config/constants';

const SettingsPage = () => {
  const { member } = useAuth();
  const { 
    serverHost, 
    serverPort, 
    connected, 
    connectToServer,
    disconnectFromServer,
    error: serverError 
  } = useServer();
  
  const [serverSettings, setServerSettings] = useState({
    host: serverHost,
    port: serverPort
  });
  
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Handle server settings changes
  const handleServerSettingChange = (e) => {
    const { name, value } = e.target;
    setServerSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle server connection update
  const handleUpdateServerConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const result = await connectToServer(serverSettings.host, Number(serverSettings.port));
      
      if (result.success) {
        setSuccess('Server connection updated successfully!');
      } else {
        setError(result.error || 'Failed to connect to server.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle disconnect server
  const handleDisconnectServer = () => {
    disconnectFromServer();
    setSuccess('Disconnected from server. You will need to reconnect when you restart the app.');
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          View your profile information and manage application settings.
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          {/* Profile Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                }
                title="Profile Information"
                subheader="Your member details"
              />
              <CardContent>
                {member ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Name
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {member.name}
                    </Typography>
                    
                    <Typography variant="subtitle1" fontWeight="bold">
                      Email
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {member.email}
                    </Typography>
                    
                    <Typography variant="subtitle1" fontWeight="bold">
                      Membership Type
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {member.membership_type || 'Standard'}
                    </Typography>
                    
                    <Typography variant="subtitle1" fontWeight="bold">
                      Status
                    </Typography>
                    <Typography 
                      variant="body1" 
                      paragraph
                      color={member.status === 'Active' ? 'success.main' : 'error.main'}
                    >
                      {member.status}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary">
                      Member ID: {member.id}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    Profile information not available.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Server Connection Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: connected ? 'success.main' : 'warning.main' }}>
                    <StorageIcon />
                  </Avatar>
                }
                title="Server Connection"
                subheader={connected ? "Connected" : "Not connected"}
              />
              <CardContent>
                <Typography variant="body2" paragraph>
                  Configure the connection to the library server.
                </Typography>
                
                {serverError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {serverError}
                  </Alert>
                )}
                
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
                
                <Box component="form" noValidate sx={{ mt: 1 }}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="host"
                    label="Server Host"
                    name="host"
                    value={serverSettings.host}
                    onChange={handleServerSettingChange}
                    variant="outlined"
                    placeholder={SERVER_CONFIG.DEFAULT_HOST}
                    InputProps={{
                      startAdornment: (
                        <WifiIcon color="action" sx={{ mr: 1 }} />
                      ),
                    }}
                  />
                  
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="port"
                    label="Server Port"
                    name="port"
                    value={serverSettings.port}
                    onChange={handleServerSettingChange}
                    variant="outlined"
                    type="number"
                    placeholder={SERVER_CONFIG.API_PORT.toString()}
                  />
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<SaveIcon />}
                      onClick={handleUpdateServerConnection}
                      disabled={loading}
                    >
                      {loading ? 'Connecting...' : 'Update Connection'}
                    </Button>
                    
                    {connected && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleDisconnectServer}
                      >
                        Disconnect
                      </Button>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default SettingsPage; 