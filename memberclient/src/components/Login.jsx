/**
 * Login Component
 * Allows members to log in with their email and PIN or QR code
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Stack,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Grid
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import QrCodeIcon from '@mui/icons-material/QrCode';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FlashlightOnIcon from '@mui/icons-material/FlashlightOn';
import FlashlightOffIcon from '@mui/icons-material/FlashlightOff';
import CloseIcon from '@mui/icons-material/Close';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { useAuth } from '../context/AuthContext';
import { APP_CONFIG } from '../config/constants';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

const Login = () => {
  const { login, loginWithQRCode, loading, error } = useAuth();
  
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [formError, setFormError] = useState('');
  const [authMethod, setAuthMethod] = useState('credentials');
  const navigate = useNavigate();
  
  // QR scanner state
  const [openQRScanner, setOpenQRScanner] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerResult, setScannerResult] = useState(null);
  const [manualQRInput, setManualQRInput] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('environment');
  const [debugMode, setDebugMode] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  
  // Refs
  const qrScannerContainerRef = useRef(null);
  const html5QrCodeScannerRef = useRef(null);
  
  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Handle tab change for authentication method
  const handleAuthMethodChange = (event, newValue) => {
    setAuthMethod(newValue);
    setFormError('');
  };
  
  /**
   * Handle form submission for email/PIN login
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Validate input
    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }
    
    if (!isValidEmail(email)) {
      setFormError('Please enter a valid email address');
      return;
    }
    
    if (!pin.trim()) {
      setFormError('PIN is required');
      return;
    }
    
    if (pin.length < APP_CONFIG.MIN_PIN_LENGTH) {
      setFormError(`PIN must be at least ${APP_CONFIG.MIN_PIN_LENGTH} digits`);
      return;
    }
    
    // Attempt to login
    const result = await login(email, pin);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setFormError(result.error || 'Authentication failed');
    }
  };
  
  /**
   * Toggle debug mode for QR scanning
   */
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
    console.log(`Debug mode ${!debugMode ? 'enabled' : 'disabled'}`);
  };
  
  /**
   * Get available camera devices
   */
  const getCameraDevices = async () => {
    setCameras([]); // Reset cameras list
    
    try {
      const devices = await Html5Qrcode.getCameras();
      console.log("Available cameras:", devices);
      
      if (devices && devices.length) {
        // Add environment option first
        const cameraOptions = [
          { id: "environment", label: "Default (Back Camera)" },
          ...devices
        ];
        
        setCameras(cameraOptions);
        setSelectedCamera("environment");
      } else {
        console.log("No cameras found");
        setScannerResult("No cameras detected on your device. Please try uploading an image or manual entry.");
      }
    } catch (error) {
      console.error("Error enumerating devices:", error);
      setScannerResult("Failed to detect cameras. Try manual entry or image upload instead.");
    }
  };
  
  /**
   * Handle camera selection change
   */
  const handleCameraChange = (event) => {
    const newCamera = event.target.value;
    console.log(`Switching camera to: ${newCamera}`);
    setSelectedCamera(newCamera);
    
    // Restart scanner with new camera
    if (scannerActive) {
      stopQRScanner();
      setTimeout(() => {
        startQRScanner();
      }, 500);
    }
  };
  
  /**
   * Stop the QR scanner
   */
  const stopQRScanner = () => {
    console.log("Stopping QR scanner");
    
    // Don't try to stop if already stopped
    if (!scannerActive) {
      console.log("Scanner already stopped");
      return;
    }
    
    setScannerActive(false);
    
    if (html5QrCodeScannerRef.current) {
      try {
        html5QrCodeScannerRef.current.stop()
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
  };
  
  /**
   * Start the QR scanner with the selected camera
   */
  const startQRScanner = async () => {
    if (!qrScannerContainerRef.current) return;
    
    // Clear previous instance
    if (html5QrCodeScannerRef.current) {
      await stopQRScanner();
      // Clear container for new instance
      qrScannerContainerRef.current.innerHTML = '';
    }
    
    setScannerResult("Starting camera...");
    setScannerActive(true);
    
    console.log('Starting QR scanner with camera:', selectedCamera);
    
    try {
      // Create scanner instance
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeScannerRef.current = html5QrCode;
      
      // Define the success callback
      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        console.log(`QR Code detected: ${decodedText}`, decodedResult);
        console.log('Raw QR Data Length:', decodedText ? decodedText.length : 0);
        console.log('QR Code format:', decodedResult.result.format);
        console.log('Timestamp:', new Date().toISOString());
        
        if (!scannerActive) {
          console.log("QR code detected but scanner is already inactive");
          // Still process the QR code even if scanner is inactive
          handleScannedQRCode(decodedText);
          return;
        }
        
        // Set scanner as inactive first to prevent multiple attempts to stop
        setScannerActive(false);
        
        try {
          // Stop scanning after successful detection
          html5QrCode.stop()
            .then(() => {
              console.log("Scanner stopped after detection");
              
              // Process the QR code
              handleScannedQRCode(decodedText);
            })
            .catch(err => {
              console.log("Note: Error stopping scanner after detection (may be already stopped):", err.message || err);
              
              // Still process the QR code even if we couldn't stop the scanner
              handleScannedQRCode(decodedText);
            });
        } catch (error) {
          console.log("Could not stop scanner, but still processing QR code:", error.message || error);
          // Process QR code anyway
          handleScannedQRCode(decodedText);
        }
      };
      
      // Define scan configuration with improved settings
      const config = {
        fps: 15, // Increase from 10 to 15 for more scans per second
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [ 
          Html5Qrcode.FORMAT_QR_CODE,
          Html5Qrcode.FORMAT_DATA_MATRIX,
          Html5Qrcode.FORMAT_EAN_13,
          Html5Qrcode.FORMAT_CODE_128
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Use the native BarcodeDetector API if available
        },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        // Disable verbose logging unless in debug mode
        verbose: debugMode
      };
      
      // Start scanner with camera
      const cameraId = selectedCamera === "environment" ? 
        { facingMode: { exact: "environment" } } : // Be more specific about wanting the back camera
        selectedCamera;
      
      console.log('Starting scanner with camera ID:', cameraId);
      
      await html5QrCode.start(
        cameraId, 
        config,
        qrCodeSuccessCallback,
        (errorMessage) => {
          // This is a deliberate false reject callback - it's actually used for logs
          // and doesn't indicate a true error (just no QR detected in current frame)
          if (debugMode && !errorMessage.includes("No QR code found")) {
            console.log(`QR Scan error: ${errorMessage}`);
          }
        }
      );
      
      // Try to set advanced camera properties if supported
      try {
        const track = html5QrCode.getRunningTrack();
        if (track && track.getCapabilities) {
          const capabilities = track.getCapabilities();
          console.log('Camera capabilities:', capabilities);
          
          // Set camera constraints to improve scanning
          const constraints = {};
          
          // Set focus mode to continuous if available
          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            constraints.focusMode = 'continuous';
          }
          
          // Set white balance mode to continuous if available
          if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes('continuous')) {
            constraints.whiteBalanceMode = 'continuous';
          }
          
          // Apply constraints if we have any
          if (Object.keys(constraints).length > 0) {
            console.log('Applying advanced camera constraints:', constraints);
            await track.applyConstraints(constraints);
          }
        }
      } catch (cameraPropError) {
        console.log('Note: Could not set advanced camera properties:', cameraPropError);
        // Non-critical error, don't throw
      }
      
      setScannerResult("Camera active! Position the QR code in the scanning area.");
      
    } catch (error) {
      console.error("Error starting QR scanner:", error);
      setScannerActive(false);
      
      let errorMessage = "Failed to start camera.";
      
      if (error.toString().includes("NotAllowedError")) {
        errorMessage = "Camera access denied. Please grant camera permissions and try again.";
      } else if (error.toString().includes("NotFoundError")) {
        errorMessage = "Camera not found. Please try another camera or use manual entry.";
      } else if (error.toString().includes("NotReadableError")) {
        errorMessage = "Camera is already in use by another application. Please close other camera apps.";
      } else if (error.toString().includes("OverconstrainedError")) {
        errorMessage = "Camera cannot satisfy the requested constraints. Trying again with minimal constraints...";
        
        // Try again with minimal constraints
        setTimeout(() => {
          try {
            const html5QrCode = new Html5Qrcode("qr-reader");
            html5QrCodeScannerRef.current = html5QrCode;
            
            // Minimal configuration
            const minimalConfig = {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              formatsToSupport: [Html5Qrcode.FORMAT_QR_CODE]
            };
            
            html5QrCode.start(
              { facingMode: "environment" }, // Generic environment facing mode
              minimalConfig,
              qrCodeSuccessCallback,
              (errorMessage) => {
                if (debugMode) console.log(`QR Scan error (retry): ${errorMessage}`);
              }
            )
            .then(() => {
              setScannerResult("Camera active! Position the QR code in the scanning area.");
              setScannerActive(true);
            })
            .catch(retryError => {
              console.error("Failed retry with minimal constraints:", retryError);
              setScannerResult(`Error: Could not start camera even with minimal settings. Please try another camera or use manual entry.`);
            });
          } catch (retryError) {
            console.error("Error during minimal constraints retry:", retryError);
            setScannerResult(`Error: Could not start camera even with minimal settings. Please try manual entry.`);
          }
        }, 1000);
        
        return; // Exit the current function as we're retrying
      }
      
      setScannerResult(`Error: ${errorMessage}`);
    }
  };
  
  /**
   * Open QR scanner dialog and initialize camera
   */
  const handleOpenQRScanner = () => {
    setOpenQRScanner(true);
    setScannerResult(null);
    setManualQRInput('');
    
    // Get available camera devices
    getCameraDevices();
  };
  
  /**
   * Close QR scanner dialog and stop camera
   */
  const handleCloseQRScanner = () => {
    setOpenQRScanner(false);
    
    // Stop the scanner and clear the scanner reference
    stopQRScanner();
    
    // In case the scanner was already stopped in a way that didn't clear the reference,
    // set the reference to null to prevent further stop attempts
    if (html5QrCodeScannerRef.current) {
      try {
        html5QrCodeScannerRef.current.stop().catch(() => {
          console.log("Scanner already stopped when closing dialog");
        });
      } catch (error) {
        console.log("Error when attempting final scanner cleanup:", error);
      } finally {
        html5QrCodeScannerRef.current = null;
      }
    }
  };
  
  // Start scanner when dialog is opened
  useEffect(() => {
    if (openQRScanner && !scannerActive && cameras.length > 0) {
      setTimeout(() => {
        startQRScanner();
      }, 500);
    }
    
    // Cleanup on unmount or when dialog closes
    return () => {
      if (html5QrCodeScannerRef.current) {
        try {
          html5QrCodeScannerRef.current.stop()
            .then(() => {
              console.log("QR scanner successfully stopped in cleanup");
              html5QrCodeScannerRef.current = null;
            })
            .catch(err => {
              // Just log the error but don't throw - this is okay if scanner is already stopped
              console.log("Note: QR scanner cleanup - scanner might already be stopped");
              html5QrCodeScannerRef.current = null;
            });
        } catch (e) {
          console.log("Error in cleanup, forcibly nullifying scanner reference");
          html5QrCodeScannerRef.current = null;
        }
      }
      
      // Ensure we mark scanner as inactive regardless of stop success
      setScannerActive(false);
    };
  }, [openQRScanner, cameras]);

  /**
   * Process a scanned QR code
   * @param {string} qrData - The QR code data
   */
  const handleScannedQRCode = async (qrData) => {
    try {
      console.log('Processing QR code data:');
      console.log('----- QR Code Data -----');
      console.log('Raw data:', qrData);
      console.log('Type:', typeof qrData);
      console.log('Length:', qrData ? qrData.length : 0);
      console.log('First 50 chars:', qrData ? qrData.substring(0, 50) : '');
      console.log('Data as URI encoded:', encodeURIComponent(qrData));
      console.log('-----------------------');

      // Display to user
      setScannerResult('Authenticating with QR code...');
      
      // First, sanitize the input - remove any whitespace
      let processedQrCode = qrData ? qrData.trim() : '';
      
      // Log the cleaned data
      console.log('Cleaned QR data:', processedQrCode);
      
      // Try to parse as JSON if it looks like JSON
      if (processedQrCode.startsWith('{') || processedQrCode.startsWith('[')) {
        try {
          console.log('Attempting to parse as JSON...');
          const jsonData = JSON.parse(processedQrCode);
          console.log('Successfully parsed JSON:', jsonData);
          
          // Check common fields that might contain the actual QR code
          if (jsonData.qr_code) {
            console.log('Found qr_code field in JSON');
            processedQrCode = jsonData.qr_code;
          } else if (jsonData.code) {
            console.log('Found code field in JSON');
            processedQrCode = jsonData.code;
          } else if (jsonData.id) {
            console.log('Found id field in JSON');
            processedQrCode = jsonData.id;
          } else if (jsonData.memberId) {
            console.log('Found memberId field in JSON');
            processedQrCode = jsonData.memberId;
          } else {
            // If we can't find a specific field, keep the JSON string as is
            console.log('No specific field found in JSON, using stringified data');
            processedQrCode = JSON.stringify(jsonData);
          }
        } catch (e) {
          console.log('JSON parsing failed:', e.message);
          // Not valid JSON, keep the original data
        }
      }
      
      // As a backup, try using the extractQrCodeData utility function
      const extractedData = extractQrCodeData(qrData);
      if (extractedData && extractedData !== processedQrCode) {
        console.log('Data extracted using utility function:', extractedData);
        if (!processedQrCode || processedQrCode.length === 0) {
          processedQrCode = extractedData;
        }
      }
      
      // If empty after processing, show error
      if (!processedQrCode || processedQrCode.length === 0) {
        console.error('QR code processing resulted in empty data');
        setScannerResult('Error: QR code data is empty or invalid');
        
        // Re-start scanner
        setTimeout(() => {
          if (!scannerActive) {
            startQRScanner();
          }
        }, 1500);
        
        return;
      }
      
      // Attempt authentication with processed QR code
      console.log("Authenticating with processed QR code:", processedQrCode);
      const result = await loginWithQRCode(processedQrCode);
      
      if (result.success) {
        console.log('QR code authentication successful:', result);
        setScannerResult('Login successful! Redirecting...');
        
        // Show member information if available
        if (result.member && result.member.name) {
          setScannerResult(`Login successful! Welcome, ${result.member.name}. Redirecting...`);
        }
        
        // Play success sound
        try {
          const successAudio = new Audio(
            "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHiNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2ysrKysrKysrKysrKysrKysrKysrKysrKy1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1v////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYJQ//zgwHgAAAOFpOUAAIDTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84MBlgAADlgAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84MBnAAADlIAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU="
          );
          await successAudio.play();
        } catch (e) {
          console.log("Audio play prevented by browser");
        }
        
        // Clear HTML5QrCode scanner reference to prevent further stop attempts
        html5QrCodeScannerRef.current = null;
        
        setTimeout(() => {
          setOpenQRScanner(false);
          navigate('/dashboard');
        }, 1500);
      } else {
        // Enhanced error reporting
        console.error('QR code authentication failed:', result.error);
        let errorMessage = result.error || 'Authentication failed';
        
        // Try to provide more specific error messages
        if (errorMessage.toLowerCase().includes('invalid qr code')) {
          errorMessage = `Invalid QR code format: "${processedQrCode.substring(0, 10)}${processedQrCode.length > 10 ? '...' : ''}" 
                         (${processedQrCode.length} chars). Ensure you are scanning a member QR code.`;
        } else if (errorMessage.toLowerCase().includes('not found')) {
          errorMessage = 'Member not found. This QR code is not registered in the system.';
        } else if (errorMessage.toLowerCase().includes('expired')) {
          errorMessage = 'QR code has expired. Please contact library staff for a new code.';
        }
        
        setScannerResult(`Error: ${errorMessage}`);
        
        // Re-start scanner if there was an error and it's not running
        if (!scannerActive) {
          setTimeout(() => {
            startQRScanner();
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      
      // Enhanced error reporting
      let errorMessage = error.message || 'Authentication failed';
      
      // Try to provide more user-friendly error messages
      if (error.message.includes('Network Error')) {
        errorMessage = 'Server connection error. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Server response timeout. Please try again.';
      } else if (error.message.includes('401')) {
        errorMessage = 'The QR code is invalid or has expired. Please contact library staff.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Authentication service not found. Please contact support.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later or contact support.';
      }
      
      setScannerResult(`Error: ${errorMessage}`);
      
      // Re-start scanner if there was an error and it's not running
      if (!scannerActive) {
        setTimeout(() => {
          startQRScanner();
        }, 1500);
      }
    }
  };

  /**
   * Extract actual QR code data from various formats
   * @param {string} qrData - The raw QR code data
   * @returns {string} - The processed QR code data
   */
  const extractQrCodeData = (qrData) => {
    if (!qrData) return null;
    
    let processedQrCode = qrData.trim();
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(processedQrCode);
      
      // Check common fields that might contain the actual QR code
      if (jsonData.qr_code) return jsonData.qr_code;
      if (jsonData.code) return jsonData.code;
      if (jsonData.id) return jsonData.id;
      if (jsonData.memberId) return jsonData.memberId;
      
      // If no specific field found, return the stringified JSON
      return processedQrCode;
    } catch (e) {
      // Not JSON, return as is
      return processedQrCode;
    }
  };

  /**
   * Handle manual QR code submission
   */
  const handleManualQRSubmit = async () => {
    if (!manualQRInput.trim()) {
      setScannerResult('Error: Please enter a QR code value');
      return;
    }
    
    console.log('Processing manual QR input:', manualQRInput);
    
    // Pre-process the input
    const processedInput = extractQrCodeData(manualQRInput.trim());
    
    setScannerResult('Authenticating with manual code...');
    
    try {
      // Attempt authentication with processed QR code
      console.log("Authenticating with manual QR code:", processedInput);
      const result = await loginWithQRCode(processedInput);
      
      if (result.success) {
        setScannerResult('Login successful! Redirecting...');
        
        // Show member information if available
        if (result.member && result.member.name) {
          setScannerResult(`Login successful! Welcome, ${result.member.name}. Redirecting...`);
        }
        
        // Play success sound
        try {
          const successAudio = new Audio(
            "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHiNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2ysrKysrKysrKysrKysrKysrKysrKysrKy1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1v////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYJQ//zgwHgAAAOFpOUAAIDTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84MBlgAADlgAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84MBnAAADlIAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU="
          );
          await successAudio.play();
        } catch (e) {
          console.log("Audio play prevented by browser");
        }
        
        setTimeout(() => {
          setOpenQRScanner(false);
          navigate('/dashboard');
        }, 1500);
      } else {
        // Enhanced error reporting
        let errorMessage = result.error || 'Authentication failed';
        
        // Try to provide more specific error messages
        if (errorMessage.toLowerCase().includes('invalid qr code')) {
          errorMessage = `Invalid QR code format. Please check the code and try again.`;
        } else if (errorMessage.toLowerCase().includes('not found')) {
          errorMessage = 'Member not found. This code is not registered in the system.';
        }
        
        console.error('Manual QR code authentication failed:', errorMessage);
        setScannerResult(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error processing manual QR code:', error);
      
      // Enhanced error reporting
      let errorMessage = error.message || 'Authentication failed';
      
      // Try to provide more user-friendly error messages
      if (error.message.includes('Network Error')) {
        errorMessage = 'Server connection error. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Server response timeout. Please try again.';
      } else if (error.message.includes('401')) {
        errorMessage = 'The QR code is invalid or has expired. Please contact library staff.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Authentication service not found. Please contact support.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later or contact support.';
      }
      
      setScannerResult(`Error: ${errorMessage}`);
    }
  };

  /**
   * Handle uploaded QR code image
   */
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Check file is an image
    if (!file.type.match('image.*')) {
      setScannerResult('Error: Please upload an image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setScannerResult('Error: Image file is too large (max 5MB)');
      return;
    }
    
    setScannerResult('Processing uploaded image...');
    
    // First, stop any running scanner
    stopQRScanner();
    
    // Create a new Html5Qrcode instance or use existing one
    let html5QrCode = html5QrCodeScannerRef.current;
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeScannerRef.current = html5QrCode;
    }
    
    // Process the file
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const imageUrl = fileReader.result;
      setUploadedImage({ src: imageUrl });
      
      // Decode the QR code from the image
      html5QrCode.scanFile(file, /* showImage= */ true)
        .then(decodedText => {
          console.log(`QR Code detected from image: ${decodedText}`);
          // Process the QR code
          handleScannedQRCode(decodedText);
        })
        .catch(error => {
          console.error("Error scanning uploaded image:", error);
          setScannerResult(`Error: Could not detect a valid QR code in the image. ${error.message || ''}`);
        });
    };
    
    fileReader.onerror = () => {
      setScannerResult('Error: Failed to read image file');
    };
    
    fileReader.readAsDataURL(file);
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', mb: 3 }}>
        <PersonIcon sx={{ fontSize: 60, mb: 2 }} color="primary" />
        <Typography variant="h4" component="h1" align="center">
          Member Login
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" align="center">
          Log in to access your account
        </Typography>
      </Box>
      
      <Tabs
        value={authMethod}
        onChange={handleAuthMethodChange}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
        aria-label="authentication method tabs"
        sx={{ mb: 3 }}
      >
        <Tab 
          icon={<PersonIcon />}
          iconPosition="start"
          label="Email & PIN" 
          value="credentials" 
        />
        <Tab 
          icon={<QrCodeScannerIcon />}
          iconPosition="start"
          label="QR Code" 
          value="qrcode" 
        />
      </Tabs>
      
      {authMethod === 'credentials' ? (
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
        
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            placeholder="Enter your email"
            disabled={loading}
            required
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              )
            }}
          />
          
          <TextField
            label="PIN"
            type={showPin ? 'text' : 'password'}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            fullWidth
            placeholder="Enter your PIN"
            disabled={loading}
            required
            inputProps={{
              maxLength: APP_CONFIG.MAX_PIN_LENGTH,
              inputMode: 'numeric',
              pattern: '[0-9]*'
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle pin visibility"
                    onClick={() => setShowPin(!showPin)}
                    edge="end"
                  >
                    {showPin ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Stack>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{ mt: 3, py: 1.5 }}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
      ) : (
        <Box sx={{ textAlign: 'center' }}>
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
          
          <Typography variant="body1" gutterBottom>
            Scan your QR code to login
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            startIcon={<QrCodeScannerIcon />}
            onClick={handleOpenQRScanner}
            sx={{ mt: 2, py: 1.5 }}
          >
            Scan QR Code
          </Button>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Your QR code was provided by the library staff
          </Typography>
        </Box>
      )}
      
      {/* QR Code Scanner Dialog */}
      <Dialog
        open={openQRScanner}
        onClose={handleCloseQRScanner}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeScannerIcon color="primary" />
            Scan Member QR Code
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={<Switch checked={debugMode} onChange={toggleDebugMode} size="small" />}
              label="Debug"
              labelPlacement="start"
              sx={{ m: 0 }}
            />
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Instructions */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              Position the QR code in the scanning area. Make sure it's well-lit and hold the camera steady.
              The scanner will automatically detect valid QR codes.
            </Typography>
            
            {/* Scanning status */}
            {scannerResult && (
              <Alert 
                severity={
                  scannerResult.includes('success') 
                    ? 'success' 
                    : scannerResult.includes('Error') || scannerResult.includes('denied') || scannerResult.includes('failed')
                    ? 'error' 
                    : scannerResult.includes('ready') || scannerResult.includes('Center') || scannerResult.includes('active')
                    ? 'info'
                    : 'warning'
                }
                sx={{ width: '100%', mb: 2 }}
              >
                {scannerResult}
              </Alert>
            )}
            
            {/* Camera selection */}
            <Stack direction="row" spacing={2} sx={{ width: '100%', mb: 2 }}>
              <FormControl variant="outlined" size="small" sx={{ flex: 1 }}>
                <InputLabel>Camera</InputLabel>
                <Select
                  value={selectedCamera}
                  onChange={handleCameraChange}
                  label="Camera"
                  startAdornment={
                    <InputAdornment position="start">
                      <CameraAltIcon fontSize="small" />
                    </InputAdornment>
                  }
                >
                  {cameras.map((camera, index) => (
                    <MenuItem key={camera.id || index} value={camera.id}>
                      {camera.label || `Camera ${index + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                onClick={() => {
                  stopQRScanner();
                  setTimeout(() => {
                    startQRScanner();
                  }, 500);
                }}
                startIcon={<CameraAltIcon />}
              >
                Restart Camera
              </Button>
            </Stack>
            
            {/* QR Scanner container */}
            <Box 
              id="qr-reader" 
              ref={qrScannerContainerRef}
              sx={{
                width: '100%',
                mb: 2,
                minHeight: '300px',
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                '& video': {
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  objectFit: 'cover',
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
            >
              {/* QR Scanner Guides - Overlay */}
              <Box 
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                  zIndex: 10,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {/* Center scanning area indicator */}
                <Box 
                  sx={{
                    width: '250px',
                    height: '250px',
                    border: '2px dashed rgba(255, 255, 255, 0.6)',
                    borderRadius: '12px',
                    position: 'relative',
                  }}
                >
                  {/* Corner markers */}
                  <Box sx={{ position: 'absolute', top: -10, left: -10, width: 30, height: 30, borderTop: '4px solid #35e33a', borderLeft: '4px solid #35e33a', borderTopLeftRadius: '8px' }} />
                  <Box sx={{ position: 'absolute', top: -10, right: -10, width: 30, height: 30, borderTop: '4px solid #35e33a', borderRight: '4px solid #35e33a', borderTopRightRadius: '8px' }} />
                  <Box sx={{ position: 'absolute', bottom: -10, left: -10, width: 30, height: 30, borderBottom: '4px solid #35e33a', borderLeft: '4px solid #35e33a', borderBottomLeftRadius: '8px' }} />
                  <Box sx={{ position: 'absolute', bottom: -10, right: -10, width: 30, height: 30, borderBottom: '4px solid #35e33a', borderRight: '4px solid #35e33a', borderBottomRightRadius: '8px' }} />
                </Box>
              </Box>
            </Box>
            
            {/* Scanning tips */}
            <Box sx={{ mb: 2, px: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Tips:</Box> 
                Hold the phone steady, ensure good lighting
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Position:</Box> 
                Center the QR code in the scanning area (green box)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Distance:</Box> 
                Hold 6-8 inches from the QR code
              </Typography>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              If scanning doesn't work, try one of these alternatives:
            </Typography>
            
            {/* Image upload option */}
            <Box sx={{ width: '100%', mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoLibraryIcon />}
                fullWidth
                sx={{ mb: 1 }}
              >
                Upload QR Code Image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
              
              {uploadedImage && (
                <Box 
                  sx={{ 
                    mt: 1, 
                    p: 1, 
                    border: '1px solid', 
                    borderColor: 'divider',
                    borderRadius: 1,
                    position: 'relative'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Uploaded Image:
                  </Typography>
                  <Box 
                    component="img" 
                    src={uploadedImage.src} 
                    alt="Uploaded QR Code"
                    sx={{ 
                      maxWidth: '100%', 
                      height: 'auto', 
                      maxHeight: '150px',
                      display: 'block',
                      mx: 'auto'
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', top: 2, right: 2 }}
                    onClick={() => setUploadedImage(null)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
            
            {/* Divider */}
            <Divider sx={{ width: '100%', mt: 1, mb: 2 }}>
              <Typography variant="caption" color="text.secondary">OR ENTER MANUALLY</Typography>
            </Divider>
            
            {/* Manual QR code entry */}
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle2" gutterBottom>
                Enter QR code manually:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter QR code value"
                value={manualQRInput}
                onChange={(e) => setManualQRInput(e.target.value)}
                sx={{ mb: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button 
                variant="contained" 
                color="primary"
                fullWidth
                onClick={handleManualQRSubmit}
                disabled={loading || !manualQRInput.trim()}
              >
                Submit Manual Code
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleCloseQRScanner} 
            startIcon={<CloseIcon />}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Login; 