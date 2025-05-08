import React, { useState, useEffect } from 'react';
import { Fab, Box, useTheme, useMediaQuery } from '@mui/material';
import { QrCodeScanner as QrCodeScannerIcon } from '@mui/icons-material';
import QRScannerDialog from './QRScannerDialog';
import ReturnBooksDialog from './ReturnBooksDialog';

/**
 * Floating QR Scanner Button component for initiating QR code scans
 * @param {function} onSuccess - Callback for when books are returned successfully
 */
const QRScannerButton = ({ onSuccess }) => {
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [loanIdsToReturn, setLoanIdsToReturn] = useState([]);
  const [batchProcessed, setBatchProcessed] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Add an effect to track dialog states and reset if needed
  useEffect(() => {
    // If both dialogs are closed, reset state completely
    if (!qrScannerOpen && !returnDialogOpen) {
      // Only log if we actually had something to reset
      if (batchProcessed || loanIdsToReturn.length > 0) {
        console.log('All dialogs closed, resetting component state');
        setBatchProcessed(false);
        setLoanIdsToReturn([]);
      }
    }
  }, [qrScannerOpen, returnDialogOpen]);

  const handleOpenQrScanner = () => {
    // Don't open the scanner if the return dialog is already open
    if (returnDialogOpen) {
      console.log('Return dialog is already open, not opening QR scanner');
      return;
    }
    
    // Reset the batch processed flag when opening the scanner
    setBatchProcessed(false);
    setQrScannerOpen(true);
  };

  const handleCloseQrScanner = () => {
    setQrScannerOpen(false);
  };

  const handleQrScannerSuccess = (result) => {
    console.log('QR scanner success:', result);
    
    // Close the QR scanner dialog
    setQrScannerOpen(false);
    
    // Check if this is a batch result and we haven't already processed it
    if (result && result.batch && !batchProcessed) {
      // Set the flag to prevent reopening
      setBatchProcessed(true);
      
      const loanIdsToProcess = result.loanIds || [];
      console.log('Batch return detected - opening return dialog with IDs:', loanIdsToProcess);
      
      if (loanIdsToProcess.length === 0) {
        console.warn('No loan IDs found in batch result!');
        return;
      }
      
      // Short delay before opening return dialog to avoid race conditions
      setTimeout(() => {
        // Set loan IDs and open return dialog
        setLoanIdsToReturn(loanIdsToProcess);
        setReturnDialogOpen(true);
      }, 300); // Small delay to ensure QR scanner is fully closed
    } else if (!result?.batch) {
      // For non-batch results, just call the success callback
      if (onSuccess) {
        onSuccess(result);
      }
    } else {
      console.log('Ignored duplicate batch result to prevent infinite loop');
    }
  };
  
  const handleCloseReturnDialog = () => {
    setReturnDialogOpen(false);
  };
  
  const handleReturnDialogSuccess = (result) => {
    console.log('Return dialog success:', result);
    setReturnDialogOpen(false);
    
    // Call the parent success callback
    if (onSuccess) {
      onSuccess(result);
    }
  };

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: isMobile ? 16 : 24,
          right: isMobile ? 16 : 24,
          zIndex: 1000,
        }}
      >
        <Fab
          color="primary"
          aria-label="scan QR code"
          onClick={handleOpenQrScanner}
          sx={{
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
            boxShadow: 3,
          }}
        >
          <QrCodeScannerIcon />
        </Fab>
      </Box>

      {/* QR Scanner Dialog */}
      <QRScannerDialog 
        open={qrScannerOpen}
        onClose={handleCloseQrScanner}
        onSuccess={handleQrScannerSuccess}
      />
      
      {/* Return Books Dialog */}
      <ReturnBooksDialog
        open={returnDialogOpen}
        onClose={handleCloseReturnDialog}
        onSuccess={handleReturnDialogSuccess}
        preloadedLoanIds={loanIdsToReturn}
      />
    </>
  );
};

export default QRScannerButton; 