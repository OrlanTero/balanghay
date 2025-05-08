import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Snackbar,
  Divider,
  CircularProgress,
  TextField,
  Input,
  IconButton,
  Tooltip,
  Stack
} from "@mui/material";
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  RestartAlt as ResetIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Save as SaveIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon
} from "@mui/icons-material";

const DatabaseManager = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [openBackupDialog, setOpenBackupDialog] = useState(false);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupPath, setBackupPath] = useState("");
  const [restorePath, setRestorePath] = useState("");
  const [lastBackupPath, setLastBackupPath] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenBackupDialog = () => {
    // Set default backup path with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    setBackupPath(`balanghay_backup_${timestamp}.sqlite`);
    setOpenBackupDialog(true);
  };

  const handleCloseBackupDialog = () => {
    setOpenBackupDialog(false);
  };

  const handleOpenRestoreDialog = () => {
    setOpenRestoreDialog(true);
  };

  const handleCloseRestoreDialog = () => {
    setOpenRestoreDialog(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleResetDatabase = async () => {
    setLoading(true);
    try {
      const result = await window.api.resetDatabase();

      if (result.success) {
        setSnackbar({
          open: true,
          message:
            "Database reset successfully. You may need to restart the application.",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to reset database: ${result.message}`,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error resetting database:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Unknown error occurred"}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
      handleCloseDialog();
    }
  };

  const handleBackupDatabase = async () => {
    setBackupLoading(true);
    try {
      // Check if window.api.backupDatabase exists
      if (!window.api || typeof window.api.backupDatabase !== 'function') {
        throw new Error("Backup functionality is not available. Please update the application.");
      }

      // First, ask user to choose a location to save the backup
      const saveOptions = {
        title: 'Save Database Backup',
        defaultPath: backupPath,
        filters: [
          { name: 'SQLite Database', extensions: ['sqlite', 'db'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      };

      const { canceled, filePath } = await window.api.showSaveDialog(saveOptions);
      
      if (canceled || !filePath) {
        setBackupLoading(false);
        return;
      }

      // Use the selected path for backup
      const result = await window.api.backupDatabase(filePath);

      if (result.success) {
        setLastBackupPath(result.backupPath);
        setSnackbar({
          open: true,
          message: `Database backed up successfully to: ${result.backupPath}`,
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: `Backup failed: ${result.message}`,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error backing up database:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Unknown error occurred"}`,
        severity: "error",
      });
    } finally {
      setBackupLoading(false);
      handleCloseBackupDialog();
    }
  };

  const handleRestoreDatabase = async () => {
    setRestoreLoading(true);
    try {
      // Check if window.api.restoreDatabase exists
      if (!window.api || typeof window.api.restoreDatabase !== 'function') {
        throw new Error("Restore functionality is not available. Please update the application.");
      }

      // First, ask user to choose a backup file to restore
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
        setRestoreLoading(false);
        return;
      }

      const selectedPath = filePaths[0];
      
      // Confirm restore
      setRestorePath(selectedPath);
      
      // Now actually do the restore
      const result = await window.api.restoreDatabase(selectedPath);

      if (result.success) {
        setSnackbar({
          open: true,
          message: "Database restored successfully. Please restart the application to ensure all changes take effect.",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: `Restore failed: ${result.message}`,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error restoring database:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Unknown error occurred"}`,
        severity: "error",
      });
    } finally {
      setRestoreLoading(false);
      handleCloseRestoreDialog();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Database Management
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Backup Database Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" color="primary" gutterBottom>
            Backup Database
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Create a backup of your database to protect your data. This will save a copy of all your library data including members, loans, books, and settings.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<BackupIcon />}
            onClick={handleOpenBackupDialog}
            disabled={backupLoading}
          >
            Backup Database
          </Button>
          
          {lastBackupPath && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Last backup saved to: {lastBackupPath}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Restore Database Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" color="primary" gutterBottom>
            Restore Database
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Restore your library from a previously saved backup. This will replace your current database with the backup file.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<RestoreIcon />}
            onClick={handleOpenRestoreDialog}
            disabled={restoreLoading}
          >
            Restore Database
          </Button>
        </CardContent>
      </Card>

      {/* Reset Database Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" color="primary" gutterBottom>
            Reset Database
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This action will reset the database to its initial state. All
            members, loans, books, and users will be deleted and replaced with
            sample data. This cannot be undone.
          </Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleOpenDialog}
            disabled={loading}
          >
            Reset Database
          </Button>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            Confirm Database Reset
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            You are about to reset the entire database to its initial state.
            This will delete all current data including members, books, loans,
            and users. The database will be recreated with sample data only.
            <br />
            <br />
            <Alert severity="warning">
              This action cannot be undone! You may need to restart the
              application after reset.
            </Alert>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} autoFocus>
            Cancel
          </Button>
          <Button
            onClick={handleResetDatabase}
            color="error"
            variant="contained"
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <ResetIcon />
              )
            }
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Database"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Confirmation Dialog */}
      <Dialog
        open={openBackupDialog}
        onClose={handleCloseBackupDialog}
        aria-labelledby="backup-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="backup-dialog-title">
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <BackupIcon color="primary" sx={{ mr: 1 }} />
            Backup Database
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Create a backup of your database. You'll be prompted to choose where to save the backup file.
          </DialogContentText>
          <Alert severity="info" sx={{ mb: 2 }}>
            The backup will include all your library data including members, books, loans, users, and settings.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBackupDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleBackupDatabase}
            color="primary"
            variant="contained"
            startIcon={
              backupLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            disabled={backupLoading}
          >
            {backupLoading ? "Backing Up..." : "Create Backup"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={openRestoreDialog}
        onClose={handleCloseRestoreDialog}
        aria-labelledby="restore-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="restore-dialog-title">
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <RestoreIcon color="secondary" sx={{ mr: 1 }} />
            Restore Database
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Restore your database from a backup file. You'll be prompted to select a backup file to restore.
          </DialogContentText>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will replace your current database. A backup of your current database will be made automatically before restoring.
          </Alert>
          <Alert severity="info">
            After restoring, you may need to restart the application for all changes to take effect.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRestoreDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleRestoreDatabase}
            color="secondary"
            variant="contained"
            startIcon={
              restoreLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <RestoreIcon />
              )
            }
            disabled={restoreLoading}
          >
            {restoreLoading ? "Restoring..." : "Restore Database"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DatabaseManager;
