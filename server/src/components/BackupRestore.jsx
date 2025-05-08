import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  Divider,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Settings as SettingsIcon,
  GetApp as DownloadIcon,
  Save as SaveIcon,
  FolderOpen as FolderIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

const BackupRestore = () => {
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [lastBackupPath, setLastBackupPath] = useState('');
  const [lastRestorePath, setLastRestorePath] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  const handleBackupDatabase = async () => {
    try {
      setBackupInProgress(true);
      
      // Check if backup functionality is available
      if (!window.api || typeof window.api.showSaveDialog !== 'function' || typeof window.api.backupDatabase !== 'function') {
        throw new Error('Backup functionality is not available. Application may need to be updated.');
      }
      
      // Ask user to choose a location to save the backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = `balanghay_backup_${timestamp}.sqlite`;
      
      const saveOptions = {
        title: 'Save Database Backup',
        defaultPath: defaultPath,
        filters: [
          { name: 'SQLite Database', extensions: ['sqlite', 'db'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      };
      
      const { canceled, filePath } = await window.api.showSaveDialog(saveOptions);
      
      if (canceled || !filePath) {
        setBackupInProgress(false);
        return;
      }
      
      // Use the selected path for backup
      const result = await window.api.backupDatabase(filePath);
      
      if (result.success) {
        setLastBackupPath(filePath);
        setSnackbar({
          open: true,
          message: `Database backed up successfully to: ${filePath}`,
          severity: 'success'
        });
      } else {
        throw new Error(result.message || 'Unknown error during backup');
      }
    } catch (error) {
      console.error('Error backing up database:', error);
      setSnackbar({
        open: true,
        message: `Backup failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestoreDatabase = async () => {
    try {
      setRestoreInProgress(true);
      
      // Check if restore functionality is available
      if (!window.api || typeof window.api.showOpenDialog !== 'function' || typeof window.api.restoreDatabase !== 'function') {
        throw new Error('Restore functionality is not available. Application may need to be updated.');
      }
      
      // Ask user to choose a backup file to restore
      const openOptions = {
        title: 'Select Database Backup to Restore',
        filters: [
          { name: 'SQLite Database', extensions: ['sqlite', 'db'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      };
      
      const { canceled, filePaths } = await window.api.showOpenDialog(openOptions);
      
      if (canceled || !filePaths || filePaths.length === 0) {
        setRestoreInProgress(false);
        return;
      }
      
      const selectedPath = filePaths[0];
      setLastRestorePath(selectedPath);
      
      // Confirm before proceeding
      if (!window.confirm(`Are you sure you want to restore the database from:\n${selectedPath}\n\nThis will replace your current database and cannot be undone. A backup of your current database will be made automatically.`)) {
        setRestoreInProgress(false);
        return;
      }
      
      // Now do the restore
      const result = await window.api.restoreDatabase(selectedPath);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: "Database restored successfully! Please restart the application to ensure all changes take effect.",
          severity: 'success'
        });
      } else {
        throw new Error(result.message || 'Unknown error during restore');
      }
    } catch (error) {
      console.error('Error restoring database:', error);
      setSnackbar({
        open: true,
        message: `Restore failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setRestoreInProgress(false);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon color="primary" /> 
        Database Backup & Restore
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Regular database backups are recommended to prevent data loss. You should back up your database before making major changes or periodically (e.g., weekly).
      </Alert>
      
      <Box sx={{ display: 'flex', flexDirection: {xs: 'column', md: 'row'}, gap: 3 }}>
        {/* Backup Card */}
        <Card sx={{ flex: 1, minWidth: 250, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BackupIcon /> Backup Database
            </Typography>
            
            <Typography variant="body2" paragraph>
              Create a backup of your database to protect your data. The backup includes all library information, books, members, loans and settings.
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={backupInProgress ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleBackupDatabase}
              disabled={backupInProgress || restoreInProgress}
            >
              {backupInProgress ? 'Backing Up...' : 'Create Backup'}
            </Button>
            
            {lastBackupPath && (
              <Alert severity="success" sx={{ mt: 2, fontSize: '0.875rem' }}>
                Last backup: {lastBackupPath}
              </Alert>
            )}
          </CardContent>
        </Card>
        
        {/* Restore Card */}
        <Card sx={{ flex: 1, minWidth: 250, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" color="secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RestoreIcon /> Restore Database
            </Typography>
            
            <Typography variant="body2" paragraph>
              Restore your library from a previously saved backup. Current data will be automatically backed up before restoring.
            </Typography>
            
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={restoreInProgress ? <CircularProgress size={20} color="inherit" /> : <FolderIcon />}
              onClick={handleRestoreDatabase}
              disabled={backupInProgress || restoreInProgress}
            >
              {restoreInProgress ? 'Restoring...' : 'Restore From Backup'}
            </Button>
            
            {lastRestorePath && (
              <Alert severity="info" sx={{ mt: 2, fontSize: '0.875rem' }}>
                Last restore: {lastRestorePath}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BackupRestore; 