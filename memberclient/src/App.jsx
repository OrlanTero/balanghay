/**
 * Main App Component
 * Sets up routing and context providers
 */
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ServerProvider, useServer } from './context/ServerContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BooksPage from './pages/BooksPage';
import TransactionsPage from './pages/TransactionsPage';
import SettingsPage from './pages/SettingsPage';

// Private route component
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isSessionValid } = useAuth();
  
  // Redirect to login if not authenticated or session is invalid
  if (!isAuthenticated || !isSessionValid()) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Authenticated route - redirects to dashboard if already logged in
const AuthRoute = ({ children }) => {
  const { isAuthenticated, isSessionValid } = useAuth();
  const { connected, autoConnectAttempted, hasRecentConnection } = useServer();
  
  // Wait for auto-connect attempt to complete
  if (!autoConnectAttempted) {
    return <div>Loading...</div>;
  }
  
  // Redirect to dashboard if authenticated and connected
  if (isAuthenticated && isSessionValid() && (connected || hasRecentConnection())) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  const { connected, autoConnectAttempted } = useServer();
  
  // Wait for auto-connect attempt to complete
  if (!autoConnectAttempted) {
    return <div>Loading...</div>;
  }
  
  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        } 
      />
      <Route 
        path="/setup" 
        element={<LoginPage />} 
      />
      <Route 
        path="/dashboard" 
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/books" 
        element={
          <PrivateRoute>
            <BooksPage />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/transactions" 
        element={
          <PrivateRoute>
            <TransactionsPage />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        } 
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <ServerProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ServerProvider>
  );
};

export default App; 