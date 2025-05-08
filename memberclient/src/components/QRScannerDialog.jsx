import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  InputAdornment,
  Divider,
  Chip,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  AssignmentReturned as ReturnIcon,
  Close as CloseIcon,
  FlashOn as FlashOnIcon,
  FlashOff as FlashOffIcon
} from '@mui/icons-material';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { returnBooks, getMemberLoans } from '../services/apiService';

const QRScannerDialog = ({ open, onClose, onSuccess }) => {
  // State for QR scanner
  const [scanning, setScanning] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('environment');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [manualInput, setManualInput] = useState('');
  
  // Remove batch return dialog state since we'll let the parent handle it
  // const [batchReturnDialogOpen, setBatchReturnDialogOpen] = useState(false);
  const [loansToReturn, setLoansToReturn] = useState([]);
  
  // Refs for QR scanner
  const qrScannerRef = useRef(null);
  const qrScannerContainerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  
  const { member } = useAuth();
  
  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setScanResult('');
      setError(null);
      setSuccess(null);
      setProcessing(false);
      setManualInput('');
      // Get cameras when dialog opens
      getCameraDevices();
    } else {
      // Stop scanner when dialog closes
      stopScanner();
    }
  }, [open]);
  
  const getCameraDevices = async () => {
    setCameras([]); // Reset cameras list
    
    try {
      const devices = await Html5Qrcode.getCameras();
      console.log("Available cameras:", devices);
      
      if (devices && devices.length) {
        // Add environment option first
        const cameraOptions = [
          { deviceId: "environment", label: "Default (Back Camera)" },
          ...devices
        ];
        
        setCameras(cameraOptions);
        setSelectedCamera("environment");
      } else {
        console.log("No cameras found");
        setScanResult("No cameras detected on your device. Please try manual entry.");
      }
    } catch (error) {
      console.error("Error enumerating devices:", error);
      setScanResult("Failed to detect cameras. Try manual entry instead.");
    }
  };
  
  const startScanner = async () => {
    if (!qrScannerContainerRef.current) return;
    
    // Clear previous instance
    if (html5QrCodeRef.current) {
      await stopScanner();
      // Clear container for new instance
      if (qrScannerContainerRef.current) {
        qrScannerContainerRef.current.innerHTML = '';
      }
    }
    
    setScanResult("Starting camera...");
    setScannerActive(true);
    setScanning(true);
    
    try {
      // Create scanner instance
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;
      
      // Define the success callback
      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        console.log(`QR Code detected: ${decodedText}`, decodedResult);
        
        // Set scanner as inactive first to prevent multiple attempts to stop
        setScannerActive(false);
        
        try {
          // Stop scanning after successful detection
          html5QrCode.stop()
            .then(() => {
              console.log("Scanner stopped after detection");
              
              // Process the QR code
              handleQRCodeScanned(decodedText);
            })
            .catch(err => {
              console.log("Note: Error stopping scanner after detection (may be already stopped):", err.message || err);
              
              // Still process the QR code even if we couldn't stop the scanner
              handleQRCodeScanned(decodedText);
            });
        } catch (error) {
          console.log("Could not stop scanner, but still processing QR code:", error.message || error);
          // Process QR code anyway
          handleQRCodeScanned(decodedText);
        }
      };
      
      // Enhanced error handling function for QR code scanning errors
      const qrCodeErrorCallback = (errorMessage, exception) => {
        // Most of these errors are just frame-by-frame failures to detect, not actual errors
        // So we only log real issues
        if (exception && exception.name !== "NotFoundException") {
          console.error("QR Scanner error:", errorMessage, exception);
          
          // Only show errors that are actual problems, not just "QR code not found in this frame"
          if (exception.name === "NotReadableError") {
            setScanResult("Error: Cannot access camera stream");
          } else if (exception.name === "NotAllowedError") {
            setScanResult("Error: Camera permission denied");
          }
        }
      };
      
      // Define enhanced scan configuration with better compatibility settings
      const config = {
        fps: 10, // Lower FPS can help with performance and detection reliability
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [ 
          Html5Qrcode.FORMAT_QR_CODE,
          Html5Qrcode.FORMAT_DATA_MATRIX,
          Html5Qrcode.FORMAT_CODE_128, // Barcode formats for wider compatibility
          Html5Qrcode.FORMAT_CODE_39,
          Html5Qrcode.FORMAT_UPC_A,
          Html5Qrcode.FORMAT_EAN_13
        ],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        videoConstraints: {
          // Add enhanced camera constraints for better performance
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          // Improved low-light setting
          advanced: [{ 
            zoom: 1.0,
            brightness: { ideal: 0.5 },
            contrast: { ideal: 0.5 },
            whiteBalanceMode: "continuous",
            focusMode: "continuous" 
          }]
        }
      };
      
      console.log("Preparing to start camera with selected mode:", selectedCamera);
      
      // Enhanced camera selection strategy
      let cameraId;
      if (selectedCamera === "environment") {
        console.log("Using environment-facing camera preference");
        cameraId = { facingMode: { exact: "environment" } };
      } else if (selectedCamera === "user") {
        console.log("Using user-facing camera preference");
        cameraId = { facingMode: { exact: "user" } };
      } else if (selectedCamera) {
        console.log("Using specific camera ID:", selectedCamera);
        cameraId = selectedCamera;
      } else {
        console.log("No camera preference set, using first available camera");
        // If no preference, try to use environment-facing camera first (more useful for QR scanning)
        cameraId = { facingMode: "environment" };
      }
      
      console.log("Starting scanner with camera ID:", cameraId, "and config:", config);
      
      await html5QrCode.start(
        cameraId, 
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      );
      
      setScanResult("Camera active! Position the QR code in the scanning area.");
      
      // Check if torch is available
      try {
        // Try different methods to check torch availability
        // Some versions use isTorchAvailable(), others use hasFlash()
        if (typeof html5QrCode.isTorchAvailable === 'function') {
          const torchCompatible = await html5QrCode.isTorchAvailable();
          setTorchAvailable(torchCompatible);
          console.log("Torch available (isTorchAvailable):", torchCompatible);
        } else if (typeof html5QrCode.hasFlash === 'function') {
          const torchCompatible = await html5QrCode.hasFlash();
          setTorchAvailable(torchCompatible);
          console.log("Torch available (hasFlash):", torchCompatible);
        } else {
          // If neither method exists, assume torch is not available
          console.log("Torch availability check not supported in this version");
          setTorchAvailable(false);
        }
      } catch (error) {
        console.log("Error checking torch availability:", error);
        setTorchAvailable(false);
      }
      
    } catch (error) {
      console.error("Error starting QR scanner:", error);
      setScannerActive(false);
      setScanning(false);
      
      let errorMessage = "Failed to start camera.";
      
      if (error.toString().includes("NotAllowedError")) {
        errorMessage = "Camera access denied. Please grant camera permissions and try again.";
      } else if (error.toString().includes("NotFoundError")) {
        errorMessage = "Camera not found. Please try another camera or use manual entry.";
      } else if (error.toString().includes("NotReadableError")) {
        errorMessage = "Camera is already in use by another application. Please close other camera apps.";
      } else if (error.toString().includes("OverconstrainedError")) {
        errorMessage = "The selected camera cannot be used. Please select another camera.";
        
        // Try fallback to any available camera
        if (selectedCamera !== "") {
          setSelectedCamera("");
          setTimeout(() => {
            console.log("Attempting to use any available camera instead...");
            startScanner();
          }, 500);
        }
      }
      
      setScanResult(`Error: ${errorMessage}`);
      setError(errorMessage);
    }
  };
  
  const stopScanner = () => {
    console.log("Stopping QR scanner");
    
    // Don't try to stop if already stopped
    if (!scannerActive) {
      console.log("Scanner already stopped");
      return;
    }
    
    setScannerActive(false);
    setScanning(false);
    
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.stop()
          .then(() => {
            console.log("QR Code scanner stopped");
          })
          .catch(err => {
            // Don't throw errors for "already stopped" conditions
            console.log("Note: Scanner may have already been stopped:", err.message || err);
          });
      } catch (error) {
        console.log("Note: Error while stopping scanner (may be already stopped):", error.message || error);
      }
    }
    
    // Clean up container
    if (qrScannerContainerRef.current) {
      try {
        const videoElements = qrScannerContainerRef.current.querySelectorAll('video');
        videoElements.forEach(video => {
          try {
            if (video.srcObject) {
              const tracks = video.srcObject.getTracks();
              tracks.forEach(track => track.stop());
              video.srcObject = null;
            }
          } catch (e) {
            console.log("Error cleaning up video element:", e);
          }
        });
      } catch (e) {
        console.log("Error cleaning up video elements:", e);
      }
    }
  };
  
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchAvailable) return;

    try {
      const newTorchState = !torchActive;
      
      // Try different methods for toggling torch based on the API version
      if (typeof html5QrCodeRef.current.torch === 'function') {
        // Newer versions use torch() method
        await html5QrCodeRef.current.torch(newTorchState);
        console.log(`Torch turned ${newTorchState ? 'ON' : 'OFF'} using torch() method`);
      } else if (typeof html5QrCodeRef.current.applyVideoConstraints === 'function') {
        // Some versions use applyVideoConstraints with torch flag
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: newTorchState }]
        });
        console.log(`Torch turned ${newTorchState ? 'ON' : 'OFF'} using applyVideoConstraints()`);
      } else {
        throw new Error('Torch functionality not supported in this device/browser');
      }

      setTorchActive(newTorchState);
    } catch (error) {
      console.error("Error toggling torch:", error);
      setError("Failed to toggle flashlight. Your device may not support this feature.");
    }
  };
  
  const handleCameraChange = (event) => {
    setSelectedCamera(event.target.value);

    // If scanner is already active, restart it with the new camera
    if (scannerActive) {
      stopScanner();
      // Short delay to ensure camera is fully stopped
      setTimeout(() => {
        startScanner();
      }, 300);
    }
  };
  
  const handleQRCodeScanned = async (qrData) => {
    try {
      // We've already stopped the scanner in the callback
      setScanResult('Processing QR code...');
      setProcessing(true);
      setError(null);
      setSuccess(null);
      
      console.log('Processing QR code data:', qrData);
      
      // First, sanitize the input - remove any whitespace
      let processedQrCode = qrData ? qrData.trim() : '';
      
      // Initialize variables to track what we find
      let foundLoanIds = false;
      let memberId = null;
      let loanIds = [];
      let transactionId = null;
      let isBatch = false;
      
      // Try to parse as JSON if it looks like JSON
      if (processedQrCode.startsWith('{') || processedQrCode.startsWith('[')) {
        try {
          console.log('Attempting to parse as JSON...');
          const jsonData = JSON.parse(processedQrCode);
          console.log('Successfully parsed JSON:', jsonData);
          
          // Check if the QR code explicitly indicates it's a batch loan
          if (jsonData.batch === true) {
            console.log('QR code explicitly marked as batch loan');
            isBatch = true;
          }
          
          // Extract member ID if present
          if (jsonData.m) {
            memberId = Number(jsonData.m);
            console.log('Found member ID in QR code:', memberId);
          } else if (jsonData.memberId) {
            memberId = Number(jsonData.memberId);
            console.log('Found memberId in QR code:', memberId);
          }
          
          // Extract transaction ID if present
          if (jsonData.t) {
            transactionId = jsonData.t;
            console.log('Found transaction ID:', transactionId);
          } else if (jsonData.transactionId) {
            transactionId = jsonData.transactionId;
            console.log('Found transaction ID:', transactionId);
          }
          
          // Check for loan IDs in simplified format
          if (jsonData.l && Array.isArray(jsonData.l) && jsonData.l.length > 0) {
            console.log('Using loan IDs from simplified format:', jsonData.l);
            // Ensure all IDs are valid numbers
            loanIds = jsonData.l
              .filter(id => id && !isNaN(Number(id)))
              .map(id => Number(id));
              
            if (loanIds.length > 0) {
              foundLoanIds = true;
              console.log('Found valid loan IDs:', loanIds);
              
              // If multiple loan IDs are found, this might be a batch
              if (loanIds.length > 1) {
                console.log('Multiple loan IDs detected, treating as potential batch loan');
                isBatch = true;
              }
            }
          } 
          // Check for loan IDs in other formats
          else if (jsonData.loansIds) {
            console.log('Found loansIds field in JSON:', jsonData.loansIds);
            // Check if the QR code indicates this is a batch loan through another field
            if (jsonData.is_batch === true || jsonData.isBatch === true) {
              console.log('JSON data has is_batch or isBatch flag set to true');
              isBatch = true;
            }
            
            // Ensure the loansIds is an array with valid numbers
            if (Array.isArray(jsonData.loansIds) && jsonData.loansIds.length > 0) {
              // Filter to ensure only valid number IDs
              loanIds = jsonData.loansIds
                .filter(id => id && !isNaN(Number(id)))
                .map(id => Number(id));
                
              if (loanIds.length > 0) {
                foundLoanIds = true;
                console.log('Found valid loan IDs:', loanIds);
                
                // If multiple loan IDs are found, this might be a batch
                if (loanIds.length > 1) {
                  console.log('Multiple loan IDs detected, treating as potential batch loan');
                  isBatch = true;
                }
              }
            } else if (typeof jsonData.loansIds === 'number' || /^\d+$/.test(String(jsonData.loansIds))) {
              // Handle case where loansIds might be a single number instead of array
              const loanId = Number(jsonData.loansIds);
              loanIds = [loanId];
              foundLoanIds = true;
              console.log('Converted single loansId to array:', loanIds);
            }
          } else if (jsonData.loanId) {
            console.log('Found loanId field, converting to loansIds format');
            // Ensure it's a valid number
            if (!isNaN(Number(jsonData.loanId))) {
              const loanId = Number(jsonData.loanId);
              loanIds = [loanId];
              foundLoanIds = true;
              console.log('Converted loanId to loansIds format:', loanIds);
            }
          } else if (jsonData.id && jsonData.type && jsonData.type.includes('loan')) {
            console.log('Found id field in loan-type JSON');
            // Ensure it's a valid number
            if (!isNaN(Number(jsonData.id))) {
              const loanId = Number(jsonData.id);
              loanIds = [loanId];
              foundLoanIds = true;
              console.log('Converted id to loansIds format:', loanIds);
            }
          }
          
          // Check if there's total_books > 1 which would indicate a batch
          if (jsonData.total_books && jsonData.total_books > 1) {
            console.log(`Found total_books = ${jsonData.total_books}, treating as batch loan`);
            isBatch = true;
          }
        } catch (e) {
          console.log('JSON parsing failed:', e.message);
          // Not valid JSON, keep the original data
        }
      }
      
      // Extract IDs if the QR code contains a numeric value or comma-separated list
      if (!foundLoanIds && /^[\d,\s]+$/.test(processedQrCode)) {
        console.log('QR code contains only numbers and commas, parsing as loan IDs');
        loanIds = processedQrCode.split(',')
          .map(id => id.trim())
          .filter(id => id.length > 0 && !isNaN(Number(id)))
          .map(id => Number(id));
        
        if (loanIds.length > 0) {
          foundLoanIds = true;
          
          // If multiple loan IDs are found, this might be a batch
          if (loanIds.length > 1) {
            console.log('Multiple comma-separated loan IDs detected, treating as potential batch loan');
            isBatch = true;
          }
        }
      }
      
      // Simple number check for a single loan ID
      if (!foundLoanIds && /^\d+$/.test(processedQrCode)) {
        console.log('QR code is a single numeric ID, converting to loansIds format');
        const loanId = Number(processedQrCode);
        loanIds = [loanId];
        foundLoanIds = true;
        console.log('Converted single numeric ID to loansIds format:', loanIds);
      }
      
      // If empty after processing, show error
      if (!foundLoanIds || loanIds.length === 0) {
        throw new Error('No valid loan IDs found in QR code');
      }
      
      // Verify member ID if present (ensure it matches the current logged-in member)
      if (memberId && member && memberId !== member.id) {
        console.warn(`Member ID in QR code (${memberId}) doesn't match current member (${member.id})`);
        throw new Error('This QR code belongs to another member. Please use your own receipts for returns.');
      }
      
      // Process the loan IDs
      console.log('Final processed loan IDs:', loanIds);
      console.log('Batch status:', isBatch);
      
      // Look up the transaction ID in the member's loans to check if it's actually a batch loan
      if (loanIds.length === 1 && transactionId && member?.id) {
        try {
          // Make a request to find all loans with the same transaction ID
          console.log('Looking up transaction ID in member loans:', transactionId);
          const loansResponse = await getMemberLoans(member.id);
          
          if (loansResponse && Array.isArray(loansResponse)) {
            // Filter loans that have the same transaction ID
            const relatedLoans = loansResponse.filter(loan => 
              loan.transaction_id === transactionId && 
              loan.status !== 'Returned' &&
              !loan.return_date
            );
            
            console.log('Found related loans with same transaction ID:', relatedLoans.length);
            
            // If we found multiple active loans with this transaction ID, it's a batch
            if (relatedLoans.length > 1) {
              console.log('Multiple active loans found with transaction ID, treating as batch');
              isBatch = true;
              
              // Update loanIds to include all related loans
              loanIds = relatedLoans.map(loan => loan.id);
              console.log('Updated loan IDs from transaction lookup:', loanIds);
            }
          }
        } catch (error) {
          console.log('Error looking up related loans:', error);
          // Continue with what we have
        }
      }
      
      if (isBatch || loanIds.length > 1) {
        // For batch returns, we'll delegate to the parent component
        console.log('Detected batch return with loan IDs:', loanIds);
        
        // First set up loans to return
        setLoansToReturn(loanIds);
        
        // Set success message
        setSuccess('QR code scanned successfully. Opening return dialog...');
        
        // Notify parent of batch mode
        if (onSuccess) {
          onSuccess({ 
            success: true, 
            batch: true, 
            loanIds: loanIds,
            message: 'Opening batch return dialog' 
          });
        }
        
        // Close this dialog after a small delay to allow the success message to be seen
        setTimeout(() => {
          onClose(); 
        }, 1000);
      } else {
        // For single returns, proceed directly
        console.log('Processing single return with loan ID:', loanIds[0]);
        
        // Format return data
        const returnData = {
          returns: [{
            loanId: loanIds[0],
            returnCondition: 'Good',
            note: 'Returned via QR code scan'
          }]
        };
        
        // Process the return
        const result = await returnBooks(returnData);
        
        if (result.success) {
          setSuccess(`Book returned successfully!`);
          // Notify parent component
          if (onSuccess) {
            onSuccess(result);
          }
        } else {
          throw new Error(result.message || 'Failed to return book');
        }
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      setError(error.message || 'Failed to process QR code');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleManualSubmit = async () => {
    if (!manualInput.trim()) {
      setError('Please enter a loan ID or QR code data');
      return;
    }
    
    // Process the manual input just like a scanned QR code
    try {
      setProcessing(true);
      await handleQRCodeScanned(manualInput);
    } catch (error) {
      console.error('Error in manual QR submission:', error);
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Scan QR Code to Return Books</Typography>
            <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
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
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Scan the QR code from your borrowing receipt to return books.
            </Typography>
            
            {/* Camera selection dropdown */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={8}>
                <FormControl variant="outlined" size="small" fullWidth>
                  <InputLabel>Camera</InputLabel>
                  <Select
                    value={selectedCamera}
                    onChange={handleCameraChange}
                    label="Camera"
                    disabled={scannerActive}
                  >
                    {cameras.map((camera, index) => (
                      <MenuItem
                        key={camera.deviceId || index}
                        value={camera.deviceId}
                      >
                        {camera.label || `Camera ${index + 1}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={getCameraDevices}
                  disabled={scannerActive}
                >
                  Refresh Cameras
                </Button>
              </Grid>
            </Grid>
            
            {/* QR Scanner Container */}
            <Box
              id="qr-reader"
              ref={qrScannerContainerRef}
              sx={{
                width: '100%',
                maxWidth: 500,
                margin: "0 auto",
                mb: 2,
                minHeight: '300px',
                '& video': {
                  width: '100%',
                  borderRadius: '8px',
                  border: '2px solid',
                  borderColor: 'primary.main',
                },
                '& img': {
                  display: 'none',  // Hide the default image
                },
                // Remove some unwanted elements from the html5-qrcode library UI
                '& button': {
                  mt: 1
                },
                '& div[class*="scan-region-highlight"]': {
                  border: '3px solid #35e33a !important', // Make scanner region green
                },
                '& div[class*="code-found-highlight"]': {
                  border: '3px solid #e74c3c !important', // Make QR found area red
                }
              }}
            />
            
            {/* Scanner Controls */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              {!scannerActive ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={startScanner}
                  disabled={processing || cameras.length === 0}
                >
                  Start Camera
                </Button>
              ) : (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {scanResult || 'Position QR code in the scanning area'}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={stopScanner}
                    sx={{ mr: 1 }}
                  >
                    Stop Camera
                  </Button>
                  {torchAvailable && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={toggleTorch}
                      startIcon={torchActive ? <FlashOffIcon /> : <FlashOnIcon />}
                    >
                      {torchActive ? 'Turn Off Flash' : 'Turn On Flash'}
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }}>
            <Chip label="OR" />
          </Divider>
          
          {/* Manual Entry Section */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Enter Loan ID Manually:
            </Typography>
            
            <TextField
              fullWidth
              label="Loan ID or QR Code Data"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              variant="outlined"
              placeholder="Enter loan ID number or paste QR code data"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCodeScannerIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleManualSubmit}
              disabled={processing || !manualInput.trim()}
              startIcon={processing ? <CircularProgress size={20} /> : <ReturnIcon />}
            >
              {processing ? 'Processing...' : 'Return Books'}
            </Button>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QRScannerDialog; 