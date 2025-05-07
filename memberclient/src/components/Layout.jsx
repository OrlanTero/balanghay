/**
 * Layout Component
 * Provides consistent layout structure for the app
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  useMediaQuery
} from '@mui/material';
import { APP_CONFIG } from '../config/constants';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 8,
        },
      },
    },
  },
});

// Drawer width
const drawerWidth = 240;

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  
  // Check if we're on the login page or server setup page
  const isLoginPage = location.pathname === '/login';
  const isServerSetupPage = location.pathname === '/setup';
  const hideSidebar = isLoginPage || isServerSetupPage;
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation items
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Books', icon: <LibraryBooksIcon />, path: '/books' },
    { text: 'Transactions', icon: <ReceiptIcon />, path: '/transactions' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
        <Box 
          component="img" 
          src={logo} 
          alt="Hiraya Balanghay Logo" 
          sx={{ 
            height: 60, 
            width: 'auto', 
            mb: 1 
          }} 
        />
        <Typography variant="subtitle1" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          Hiraya Balanghay
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            onClick={() => handleNavigation(item.path)}
            selected={location.pathname === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.12)',
                },
              },
            }}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      {isAuthenticated && (
        <List>
          <ListItem button onClick={handleLogout}>
            <ListItemIcon>
              <ExitToAppIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      )}
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar
          position="fixed"
          sx={{
            width: hideSidebar ? '100%' : { sm: `calc(100% - ${drawerWidth}px)` },
            ml: hideSidebar ? 0 : { sm: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            {!hideSidebar && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { sm: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              {hideSidebar && (
                <Box 
                  component="img" 
                  src={logo} 
                  alt="Hiraya Balanghay Logo" 
                  sx={{ 
                    height: 40, 
                    width: 'auto', 
                    mr: 2 
                  }} 
                />
              )}
              <Typography variant="h6" component="div">
                {APP_CONFIG.APP_NAME}
              </Typography>
            </Box>
            <Typography variant="body2" color="inherit">
              v{APP_CONFIG.APP_VERSION}
            </Typography>
          </Toolbar>
        </AppBar>
        
        {!hideSidebar && (
          <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            aria-label="navigation menu"
          >
            {/* Mobile drawer */}
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile
              }}
              sx={{
                display: { xs: 'block', sm: 'none' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
              }}
            >
              {drawer}
            </Drawer>
            
            {/* Desktop drawer */}
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', sm: 'block' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
              }}
              open
            >
              {drawer}
            </Drawer>
          </Box>
        )}
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: hideSidebar ? '100%' : { sm: `calc(100% - ${drawerWidth}px)` },
            mt: { xs: 8, sm: 8 },
          }}
        >
          {children}
        </Box>
      </Box>
      <Box 
        component="footer" 
        sx={{ 
          py: 2, 
          bgcolor: 'background.paper', 
          textAlign: 'center',
          width: hideSidebar ? '100%' : { sm: `calc(100% - ${drawerWidth}px)` },
          ml: hideSidebar ? 0 : { sm: `${drawerWidth}px` },
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Hiraya Balanghay Library Management System
        </Typography>
      </Box>
    </ThemeProvider>
  );
};

export default Layout; 