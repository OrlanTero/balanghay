import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Grid,
  InputAdornment,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Tooltip,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  Avatar,
  Popover,
} from "@mui/material";
import {
  Book as BookIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Search as SearchIcon,
  LibraryBooks as LibraryBooksIcon,
  EventNote as EventNoteIcon,
  Autorenew as AutorenewIcon,
  AssignmentReturn as ReturnIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Print as PrintIcon,
  QrCode as QrCodeIcon,
  QrCodeScanner as QrCodeScannerIcon,
  FlashOn as FlashOnIcon,
  FlashOff as FlashOffIcon,
  LocationOn as LocationOn,
  Delete,
  Receipt as ReceiptIcon,
  AssignmentReturned as AssignmentReturnedIcon,
  Settings as SettingsIcon,
  Camera as CameraIcon,
  CameraAlt as CameraAltIcon,
} from "@mui/icons-material";
import QRCode from "qrcode";
import { Html5Qrcode } from "html5-qrcode"; // Replace jsQR with Html5Qrcode
// Import MultiBookReturn component for multiple book returns
import MultiBookReturn from "./MultiBookReturn";

const LoanManagement = () => {
  const receiptRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [bookSearchTerm, setBookSearchTerm] = useState("");
  const [openBorrowDialog, setOpenBorrowDialog] = useState(false);
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [openMemberSelectDialog, setOpenMemberSelectDialog] = useState(false);
  const [openBookSelectDialog, setOpenBookSelectDialog] = useState(false);
  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  
  // State for multiple book return dialog
  const [multiReturnDialogOpen, setMultiReturnDialogOpen] = useState(false);
  const [selectedMemberForReturn, setSelectedMemberForReturn] = useState(null);

  // State for new borrow dialog
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [checkoutDate, setCheckoutDate] = useState(
    new Date().toISOString().split("T")[0]
  ); // YYYY-MM-DD format
  const [dueDate, setDueDate] = useState(
    (() => {
      const date = new Date();
      date.setDate(date.getDate() + 14); // Add 14 days
      return date.toISOString().split("T")[0]; // YYYY-MM-DD format
    })()
  );

  // Update the state type for selected loans to include condition and notes
  const [selectedLoans, setSelectedLoans] = useState([]);

  // Add handler function to update loan condition
  const handleLoanConditionChange = (loanId, condition) => {
    setSelectedLoans(prevLoans => {
      return prevLoans.map(loan => {
        if (loan.id === loanId) {
          return { ...loan, returnCondition: condition };
        }
        return loan;
      });
    });
  };

  // Add handler function to update loan notes
  const handleLoanNoteChange = (loanId, note) => {
    setSelectedLoans(prevLoans => {
      return prevLoans.map(loan => {
        if (loan.id === loanId) {
          return { ...loan, note: note };
        }
        return loan;
      });
    });
  };

  const [openQRScannerDialog, setOpenQRScannerDialog] = useState(false);
  const [qrScannerActive, setQRScannerActive] = useState(false);
  const [scannerResult, setScannerResult] = useState(null);
  const videoRef = useRef(null);
  const [qrCodeData, setQrCodeData] = useState("");
  const canvasRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("environment");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const currentStreamRef = useRef(null);
  const html5QrCodeScannerRef = useRef(null);
  const qrScannerContainerRef = useRef(null);

  // Add a manual entry option for QR data
  const [manualQRInput, setManualQRInput] = useState("");

  // Add new state for database repair status
  const [isRepairing, setIsRepairing] = useState(false);

  // Add new state for selected book copy ID
  const [selectedBookCopyId, setSelectedBookCopyId] = useState("");

  // Add new state for loan clearing confirmation dialog
  const [openClearLoansDialog, setOpenClearLoansDialog] = useState(false);
  const [isClearingLoans, setIsClearingLoans] = useState(false);

  // Add these new state variables
  const [openCopySelectDialog, setOpenCopySelectDialog] = useState(false);
  const [availableCopiesByBook, setAvailableCopiesByBook] = useState({});
  const [selectedBookCopies, setSelectedBookCopies] = useState([]);
  const [loadingCopies, setLoadingCopies] = useState(false);

  // Add state for QR popup
  const [qrPopoverAnchor, setQrPopoverAnchor] = useState(null);
  const [currentLoanQR, setCurrentLoanQR] = useState(null);

  const [hasSchemaIssue, setHasSchemaIssue] = useState(false);

  // Add these state variables near the beginning of the component where other states are defined
  const [batchReturnDialogOpen, setBatchReturnDialogOpen] = useState(false);
  const [batchLoansToReturn, setBatchLoansToReturn] = useState([]);
  const [selectedBatchItems, setSelectedBatchItems] = useState([]);
  const [loadingBatchLoans, setLoadingBatchLoans] = useState(false);

  // Add this new function for batch return handling
  const handleBatchReturnFromQRCode = async (loanIds, memberId = null) => {
    try {
      setLoadingBatchLoans(true);
      console.log(`Fetching batch loan details for loan IDs: ${loanIds.join(', ')}`);
      
      // Get the full details for all loans in the batch
      let fetchedLoans = [];
      let batchMainLoan = null;
      
      // First, try to check if any of these is a batch loan
      for (const loanId of loanIds) {
        try {
          console.log(`Checking if loan ${loanId} is a batch loan...`);
          const loanDetails = await window.api.getLoanDetails(loanId);
          console.log(`Got loan details for ${loanId}:`, loanDetails);
          
          if (loanDetails && loanDetails.is_batch) {
            console.log(`Found batch loan: ${loanId}`);
            batchMainLoan = loanDetails;
            break;
          } else if (loanDetails) {
            // Check if this loan is part of a batch by checking its transaction_id
            if (loanDetails.transaction_id && !loanDetails.is_batch) {
              // This might be an individual loan within a batch
              // Let's see if we can get other loans with the same transaction_id
              console.log(`Checking if loan ${loanId} is part of a batch via transaction ID: ${loanDetails.transaction_id}`);
              try {
                const memberLoans = await window.api.getLoansByMember(loanDetails.member_id);
                const relatedLoans = memberLoans.filter(loan => 
                  loan.transaction_id === loanDetails.transaction_id && 
                  loan.status !== 'Returned'
                );
                
                if (relatedLoans.length > 1) {
                  console.log(`Found ${relatedLoans.length} related loans through transaction ID`);
                  // This is likely part of a batch - add all related loans
                  fetchedLoans.push(...relatedLoans);
                  // No need to add individually again below since we've added all related loans here
                  continue;
                }
              } catch (err) {
                console.log("Error finding related loans:", err);
              }
            }
            fetchedLoans.push(loanDetails);
          }
        } catch (error) {
          console.error(`Error checking loan ${loanId}:`, error);
        }
      }
      
      // If we found a batch loan, use its details
      if (batchMainLoan) {
        console.log(`Processing batch loan with ${batchMainLoan.total_books} books`);
        fetchedLoans = [batchMainLoan];
      } 
      // Otherwise, if we have no loans but have a member ID, try getting all member loans
      else if (fetchedLoans.length === 0 && memberId) {
        console.log(`No batch loans found. Fetching all loans for member ${memberId}`);
        try {
          const memberLoans = await window.api.getLoansByMember(memberId);
          console.log(`Found ${memberLoans.length} loans for member ${memberId}`);
          
          // Filter to only include active loans whose IDs match our loanIds list
          fetchedLoans = memberLoans.filter(loan => 
            loan.status !== 'Returned' && 
            (loanIds.includes(loan.id) || 
             (loan.is_batch && loan.loan_ids && loan.loan_ids.some(id => loanIds.includes(id))))
          );
        } catch (error) {
          console.error(`Error fetching loans for member ${memberId}:`, error);
          throw new Error(`Could not find loans for member. Please try another method.`);
        }
      }
      
      console.log('Fetched loans for batch return:', fetchedLoans);
      
      if (fetchedLoans.length === 0) {
        throw new Error('No active loans found matching the QR code. The loans may have already been returned.');
      }
      
      // Prepare the loans for display in the batch return dialog
      const batchItems = [];
      
      // Process each loan to extract individual items
      for (const loan of fetchedLoans) {
        if (loan.is_batch && loan.book_titles && Array.isArray(loan.book_titles)) {
          // For batch loans, process each book in the batch
          console.log(`Processing batch loan with ${loan.book_titles.length} books`);
          
          // If we have individual loan IDs and their statuses, use them to filter
          const individualLoans = [];
          
          // Try to find all individual loans first (if available)
          if (loan.loan_ids && loan.loan_ids.length > 0) {
            // For each individual loan ID, try to get details to check if it's been returned
            for (let i = 0; i < loan.loan_ids.length; i++) {
              try {
                const individualId = loan.loan_ids[i];
                if (!individualId) continue;
                
                // Try to get the loan status if possible
                let individualStatus = 'Unknown';
                try {
                  const individualDetails = await window.api.getLoanDetails(individualId);
                  individualStatus = individualDetails ? individualDetails.status : 'Unknown';
                } catch (e) {
                  console.log(`Couldn't fetch status for loan ${individualId}, will include it anyway:`, e);
                  // If we can't determine status, assume it's active (not returned)
                  individualStatus = loan.status || 'Checked Out';
                }
                
                // Only include the loan if it hasn't been returned
                if (individualStatus !== 'Returned') {
                  individualLoans.push({
                    id: individualId,
                    index: i,
                    status: individualStatus
                  });
                } else {
                  console.log(`Skipping loan ${individualId} as it has status: ${individualStatus}`);
                }
              } catch (error) {
                console.error(`Error processing individual loan at index ${i}:`, error);
              }
            }
          }
          
          if (individualLoans.length > 0) {
            console.log(`Found ${individualLoans.length} active individual loans within the batch`);
            
            // Process only the active individual loans
            for (const individualLoan of individualLoans) {
              const i = individualLoan.index;
              
              batchItems.push({
                loanId: loan.id,
                individualId: individualLoan.id,
                bookCopyId: loan.book_copy_ids ? loan.book_copy_ids[i] : null,
                title: loan.book_titles[i],
                barcode: loan.book_barcodes ? loan.book_barcodes[i] : 'N/A',
                author: loan.book_authors ? loan.book_authors[i] : (loan.book_author || ''),
                cover: loan.book_covers ? loan.book_covers[i] : (loan.book_cover || null),
                coverColor: loan.book_colors ? loan.book_colors[i] : (loan.book_color || null),
                isbn: loan.book_isbns ? loan.book_isbns[i] : (loan.book_isbn || ''),
                status: individualLoan.status
              });
            }
          } else {
            // Fallback: if we don't have individual statuses, just check the main loan status
            // and include all books in the batch if the main loan is active
            console.log('No individual loan statuses found, using batch status:', loan.status);
            if (loan.status !== 'Returned') {
              for (let i = 0; i < loan.book_titles.length; i++) {
                // For books in a batch, use individual loan IDs if available
                const individualId = loan.loan_ids && loan.loan_ids[i] 
                  ? loan.loan_ids[i] 
                  : null;
                
                batchItems.push({
                  loanId: loan.id,
                  individualId: individualId,
                  bookCopyId: loan.book_copy_ids ? loan.book_copy_ids[i] : null,
                  title: loan.book_titles[i],
                  barcode: loan.book_barcodes ? loan.book_barcodes[i] : 'N/A',
                  author: loan.book_authors ? loan.book_authors[i] : (loan.book_author || ''),
                  cover: loan.book_covers ? loan.book_covers[i] : (loan.book_cover || null),
                  coverColor: loan.book_colors ? loan.book_colors[i] : (loan.book_color || null),
                  isbn: loan.book_isbns ? loan.book_isbns[i] : (loan.book_isbn || ''),
                  status: loan.status
                });
              }
            }
          }
        } else {
          // For single book loans
          if (loan.status !== 'Returned') {
            batchItems.push({
              loanId: loan.id,
              individualId: null,
              bookCopyId: loan.book_copy_id,
              title: loan.book_title,
              barcode: loan.book_barcode,
              author: loan.book_author,
              cover: loan.book_cover,
              coverColor: loan.book_color,
              isbn: loan.book_isbn || '',
              status: loan.status
            });
          }
        }
      }
      
      console.log('Prepared batch items for return:', batchItems);
      
      if (batchItems.length === 0) {
        throw new Error('No available books to return. All books in this batch may have already been returned.');
      }
      
      // Set the batch items and open the dialog
      setBatchLoansToReturn(batchItems);
      
      // By default, select all items
      setSelectedBatchItems(batchItems.map(item => 
        item.individualId || item.loanId
      ));
      
      // Open the batch return dialog
      setBatchReturnDialogOpen(true);
      
    } catch (error) {
      console.error('Error preparing batch return:', error);
      setSnackbar({
        open: true,
        message: `Error preparing batch return: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoadingBatchLoans(false);
    }
  };
  
  // Add this function to handle the confirmation of batch returns
  const handleConfirmBatchReturn = async () => {
    try {
      if (selectedBatchItems.length === 0) {
        setSnackbar({
          open: true,
          message: 'Please select at least one book to return',
          severity: 'warning'
        });
        return;
      }
      
      setLoadingBatchLoans(true);
      console.log('Returning selected batch items:', selectedBatchItems);
      
      // Format the data for the API to handle multiple returns
      const returnData = {
        loansIds: selectedBatchItems,
        skipMemberCheck: true // Allow returning without strict member check
      };
      
      console.log('Sending batch return data:', returnData);
      
      // Use the returnBooksViaQR API for processing
      const result = await window.api.returnBooksViaQR(JSON.stringify(returnData));
      
      if (result.success) {
        // Play success sound
        try {
          const successAudio = new Audio(
            "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHiNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2ysrKysrKysrKysrKysrKysrKysrKysrKy1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1v////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYJQ//zgwHgAAAOFpOUAAIDTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84MBlgAADlgAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84MBnAAADlIAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU="
          );
          await successAudio.play();
        } catch (e) {
          console.log("Audio play prevented by browser");
        }
        
        // Show user-friendly message with count of returned books
        const returnCount = result.returnedLoans ? result.returnedLoans.length : selectedBatchItems.length;
        
        setSnackbar({
          open: true,
          message: `Successfully returned ${returnCount} book(s)`,
          severity: 'success'
        });
        
        // Close dialogs
        setBatchReturnDialogOpen(false);
        handleCloseQRScannerDialog();
        
        // Refresh the loans list
        setTimeout(() => {
          fetchLoansByTab(activeTab);
        }, 800);
      } else {
        throw new Error(result.message || 'Failed to return books');
      }
    } catch (error) {
      console.error('Error processing batch return:', error);
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'Error returning books';
      
      if (errorMessage.includes('no active loans found') || errorMessage.includes('No loans found')) {
        errorMessage = 'No active loans found matching the selected books. They may have already been returned.';
      } else if (errorMessage.includes('undefined binding')) {
        errorMessage = 'Database error: Required information is missing. Please try again or use the individual return buttons.';
      }
      
      setSnackbar({
        open: true,
        message: `Error: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoadingBatchLoans(false);
    }
  };
  
  // Function to toggle selection of batch items
  const toggleBatchItemSelection = (itemId) => {
    setSelectedBatchItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };
  
  // Modify the handleScannedQRCode function to call handleBatchReturnFromQRCode when appropriate
  const handleScannedQRCode = async (qrData) => {
    try {
      // We've already stopped the scanner in the callback
      
      console.log('Processing QR code data:');
      console.log('----- QR Code Data -----');
      console.log('Raw data:', qrData);
      console.log('Type:', typeof qrData);
      console.log('Length:', qrData ? qrData.length : 0);
      console.log('First 50 chars:', qrData ? qrData.substring(0, 50) : '');
      console.log('Data as URI encoded:', encodeURIComponent(qrData));
      console.log('-----------------------');

      // Display to user that we're processing
      setScannerResult('Processing QR code...');
      
      // First, sanitize the input - remove any whitespace
      let processedQrCode = qrData ? qrData.trim() : '';
      
      // Log the cleaned data
      console.log('Cleaned QR data:', processedQrCode);
      
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
          
          // First check for the new simplified format
          if (jsonData.type === "receipt") {
            console.log('Found receipt format');
            
            // Extract loan IDs from the simplified format
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
              } else {
                console.warn('No valid loan IDs found in array:', jsonData.l);
                // Proceed to transaction ID lookup as fallback
              }
            } 
          }
          // Then check common fields that might contain loan information (old format)
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
              } else {
                console.warn('loansIds array exists but contains no valid IDs:', jsonData.loansIds);
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
      if (!processedQrCode || processedQrCode.length === 0) {
        console.error('QR code processing resulted in empty data');
        setScannerResult('Error: QR code data is empty or invalid');
        
        // Re-start scanner
        setTimeout(() => {
          if (!qrScannerActive) {
            startQRScanner();
          }
        }, 1500);
        return;
      }
      
      // If we found loan IDs and it might be a batch OR multiple loan IDs, use the batch return handler
      if (foundLoanIds && (isBatch || loanIds.length > 1)) {
        console.log('Using batch return handler for loans:', loanIds, 'isBatch:', isBatch);
        try {
          // Even if we only have one loan ID, if it's marked as a batch, use the batch handler
          await handleBatchReturnFromQRCode(loanIds, memberId);
          return; // Exit early since batch handler will manage the UI flow
        } catch (batchError) {
          console.error('Error in batch return handler:', batchError);
          setScannerResult(`Error: ${batchError.message}`);
          
          // Re-start scanner after error
          setTimeout(() => {
            if (!qrScannerActive) {
              startQRScanner();
            }
          }, 3000);
          return;
        }
      }
      
      // For single loans, proceed with the normal return process
      console.log('Final processed QR code data for single loan:', processedQrCode);
      setScannerResult('Returning books via QR code...');
      
      // For single loan returns, need to convert back to JSON if we've extracted IDs
      if (foundLoanIds && loanIds.length === 1) {
        const dataWithMember = { 
          loansIds: loanIds
        };
        
        // Add member ID if available
        if (memberId) {
          dataWithMember.memberId = memberId;
        } else {
          dataWithMember.skipMemberCheck = true;
        }
        
        // Include transaction ID if available
        if (transactionId) {
          dataWithMember.transactionId = transactionId;
        }
        
        processedQrCode = JSON.stringify(dataWithMember);
      }

      // For single loan returns, use the special window.api.returnBooksViaQR function with the processed data
      console.log('Sending to returnBooksViaQR API:', processedQrCode);
      const result = await window.api.returnBooksViaQR(processedQrCode);
      console.log('API returned result:', result);

      if (result.success) {
        // Play success sound
        try {
          const successAudio = new Audio(
            "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHiNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2ysrKysrKysrKysrKysrKysrKysrKysrKy1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1v////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYJQ//zgwHgAAAOFpOUAAIDTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84MBlgAADlgAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/84MBnAAADlIAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU="
          );
          await successAudio.play();
        } catch (e) {
          console.log("Audio play prevented by browser");
        }
        
        setScannerResult(result.message || "Books returned successfully!");
        setSnackbar({
          open: true,
          message: result.message || "Books returned successfully!",
          severity: "success",
        });

        // Refresh the loans list after a successful return
        setTimeout(() => {
          fetchLoansByTab(activeTab);
          handleCloseQRScannerDialog();
        }, 2000);
      } else {
        // Enhanced error reporting
        let errorMessage = result.error || result.message || 'Failed to return books';
        
        // Try to provide more specific error messages
        if (errorMessage.toLowerCase().includes('undefined binding')) {
          errorMessage = `Database query error: Member ID is required but not provided. Please try a different QR code.`;
        } else if (errorMessage.toLowerCase().includes('no valid loan ids found')) {
          errorMessage = `No valid loan IDs found in QR code. This QR code doesn't contain loan information or the loans may have already been returned.`;
        } else if (errorMessage.toLowerCase().includes('no active loans found with ids')) {
          // Create a more user-friendly message for mismatched loan IDs 
          const memberIdMatch = errorMessage.match(/Member ID (\d+) has active loans/);
          const loanIdsMatch = errorMessage.match(/No active loans found with IDs: ([^.]+)/);
          const activeLoanMatch = errorMessage.match(/Member has different active loans: ([^.]+)/);
          
          let qrLoanIds = loanIdsMatch ? loanIdsMatch[1] : "unknown";
          let actualLoanIds = activeLoanMatch ? activeLoanMatch[1] : "unknown";
          
          errorMessage = `This QR code contains loan IDs (${qrLoanIds}) that don't match the current active loans (${actualLoanIds}).

This can happen if:
1. You're scanning a receipt from a previous borrowing session where books were already returned
2. The loans have been modified since the receipt was generated
3. You're scanning a receipt for a different member's loans

Please check the active loans list and use the direct return buttons instead.`;
        } else if (errorMessage.toLowerCase().includes('invalid')) {
          errorMessage = `Invalid QR code format. The QR code doesn't contain valid loan information.`;
        } else if (errorMessage.toLowerCase().includes('not found')) {
          errorMessage = 'Loan not found. This QR code is not associated with any active loans.';
        } else if (errorMessage.toLowerCase().includes('already returned')) {
          errorMessage = 'The books associated with this QR code have already been returned.';
        }
        
        console.error('QR code processing failed:', errorMessage);
        setScannerResult(`Error: ${errorMessage}`);
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: "error",
        });
        
        // Re-start scanner if there was an error
        setTimeout(() => {
          if (!qrScannerActive) {
            startQRScanner();
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      
      // Enhanced error reporting
      let errorMessage = error.message || 'Failed to process QR code';
      
      // Try to provide more user-friendly error messages
      if (error.message && error.message.includes('Network Error')) {
        errorMessage = 'Server connection error. Please check your internet connection.';
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage = 'Server response timeout. Please try again.';
      } else if (error.message && error.message.includes('404')) {
        errorMessage = 'Return service not found. Please contact support.';
      } else if (error.message && error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later or contact support.';
      } else if (error.message && error.message.includes('undefined binding')) {
        errorMessage = 'Database error: Member ID is required but not provided.';
      } else if (error.message && error.message.includes('No active loans found with IDs')) {
        // Detailed explanation for the common mismatch error
        errorMessage = 'The QR code contains loan IDs that don\'t match the currently active loans. This usually happens when a receipt is from an older borrowing session or the books have already been returned.';
      }
      
      setScannerResult(`Error: ${errorMessage}`);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
      
      // Re-start scanner if there was an error
      setTimeout(() => {
        if (!qrScannerActive) {
          startQRScanner();
        }
      }, 3000);
    }
  };

  const handleManualQRSubmit = () => {
    if (manualQRInput.trim() === "") {
      setScannerResult("Please enter QR code data");
      return;
    }

    try {
      // Try to process the input in various formats
      let processedInput = manualQRInput.trim();

      // If it's a URL or contains URL encoded data, try to extract
      if (processedInput.includes("%")) {
        try {
          processedInput = decodeURIComponent(processedInput);
        } catch (e) {
          console.log("Not a URL encoded string");
        }
      }

      // Try to parse as JSON if it looks like JSON
      if (
        (processedInput.startsWith("{") && processedInput.endsWith("}")) ||
        (processedInput.startsWith("[") && processedInput.endsWith("]"))
      ) {
        try {
          // Validate if it's parseable JSON but keep as string
          JSON.parse(processedInput);
        } catch (e) {
          console.log("Invalid JSON format:", e);
        }
      }

      // For QR codes from loan receipts, they might start with LOAN- or contain specific patterns
      // Allow direct ID entry for simplicity
      if (/^\d+$/.test(processedInput)) {
        processedInput = JSON.stringify({
          loansIds: [parseInt(processedInput)],
        });
      }

      handleScannedQRCode(processedInput);
    } catch (error) {
      console.error("Error processing manual QR input:", error);
      setScannerResult("Invalid QR code data format");
    }
  };

  // Function to clear all loans
  const handleClearAllLoans = async () => {
    try {
      setIsClearingLoans(true);
      // The correct path is just window.api.clearLoans() for the legacy API structure
      const result = await window.api.clearLoans();

      if (result.success) {
        setSnackbar({
          open: true,
          message: `Successfully cleared all loans. ${result.message}`,
          severity: "success",
        });

        // Refresh loans list
        fetchLoansByTab(activeTab);
      } else {
        setSnackbar({
          open: true,
          message: `Failed to clear loans: ${result.error || "Unknown error"}`,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error clearing loans:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to clear loans"}`,
        severity: "error",
      });
    } finally {
      setIsClearingLoans(false);
      setOpenClearLoansDialog(false);
    }
  };

  // Function to open clear loans confirmation dialog
  const handleOpenClearLoansDialog = () => {
    setOpenClearLoansDialog(true);
  };

  // Function to close clear loans confirmation dialog
  const handleCloseClearLoansDialog = () => {
    setOpenClearLoansDialog(false);
  };

  // Debug function to show the current camera view as an image
  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw scanning overlay for reference
    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 4;

    // Draw scan region indicator
    const scanWidth = Math.floor(canvas.width * 0.6);
    const scanHeight = Math.floor(canvas.height * 0.6);
    const startX = Math.floor((canvas.width - scanWidth) / 2);
    const startY = Math.floor((canvas.height - scanHeight) / 2);

    ctx.strokeRect(startX, startY, scanWidth, scanHeight);

    // Convert to data URL
    const imageDataUrl = canvas.toDataURL("image/png");

    // Set to state to display in dialog
    setDebugImage(imageDataUrl);
    setShowDebugImage(true);
  };

  const [debugImage, setDebugImage] = useState(null);
  const [showDebugImage, setShowDebugImage] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load members
        const membersData = await window.api.getAllMembers();
        setMembers(membersData);

        // Load books
        const booksData = await window.api.getAllBooks();
        setBooks(booksData);

        // Load initial loans
        await fetchLoansByTab(activeTab);
      } catch (error) {
        console.error("Error loading initial data:", error);
        setSnackbar({
          open: true,
          message: "Error loading initial data: " + error.message,
          severity: "error",
        });
      }
    };

    loadData();
  }, [fetchLoansByTab, activeTab]); // Add fetchLoansByTab to the dependency array

  // Add logging to inspect loan data when it updates
  useEffect(() => {
    if (loans.length > 0) {
      console.log("Loans data loaded:", loans);
      console.log("First loan sample:", loans[0]);
    }
  }, [loans]);

  // Check if we're being redirected from a book details page with a specific copy to borrow
  const storedBookCopyId = localStorage.getItem("selectedBookCopyId");
  const redirectToBorrow = localStorage.getItem("redirectToBorrow");

  if (storedBookCopyId && redirectToBorrow === "true") {
    handleDirectCopyBorrow(storedBookCopyId);

    // Clear the localStorage flags
    localStorage.removeItem("selectedBookCopyId");
    localStorage.removeItem("redirectToBorrow");
  }

  // Handle borrowing a specific book copy
  async function handleDirectCopyBorrow(copyId) {
    try {
      // 1. First get the book copy details
      const bookCopy = await window.api.getBookCopyById(copyId);
      if (!bookCopy) {
        throw new Error(`Book copy with ID ${copyId} not found`);
      }

      // 2. Get the book details
      const book = await window.api.getBookById(bookCopy.book_id);

      // 3. Open the borrow dialog
      handleOpenBorrowDialog();

      // 4. Set the selected book
      setSelectedBooks([book]);

      // 5. Show notification that we need to select a member to complete the borrow process
      setSnackbar({
        open: true,
        message: "Please select a member to borrow this book copy",
        severity: "info",
      });

      // 6. Store the specific copy ID to be used when borrowing
      setSelectedBookCopyId(copyId);
    } catch (error) {
      console.error("Error initializing direct book copy borrow:", error);
      setSnackbar({
        open: true,
        message: `Error: ${
          error.message || "Failed to initialize borrowing process"
        }`,
        severity: "error",
      });
    }
  }

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    fetchLoansByTab(newValue);
  };

  // Function to fetch loans for the current tab
  const fetchLoansByTab = useCallback(async (tabValue) => {
    setLoading(true);
    try {
      let loansData;

      if (tabValue === 0) {
        // All active loans
        const result = await window.api.getActiveLoans();
        loansData = result;
      } else if (tabValue === 1) {
        // Overdue loans
        const result = await window.api.getOverdueLoans();
        loansData = result;
      } else {
        // All loans (including returned)
        const result = await window.api.getAllLoans();
        loansData = result;
      }

      // Check if the loans data has the expected structure
      // This helps identify schema issues
      if (loansData.length > 0) {
        const hasNecessaryFields = loansData.every(
          (loan) => loan.book_copy_id || loan.book_id
        );
        setHasSchemaIssue(!hasNecessaryFields);
      } else {
        // If there are no loans, we'll check the database schema directly
        try {
          const schemaCheck = await window.api.updateLoansTable();
          setHasSchemaIssue(!schemaCheck.success);
        } catch (error) {
          console.error("Error checking schema:", error);
          setHasSchemaIssue(true);
        }
      }

      setLoans(loansData);
    } catch (error) {
      console.error("Error fetching loans:", error);
      setSnackbar({
        open: true,
        message: "Error fetching loans: " + error.message,
        severity: "error",
      });
      setLoans([]);
      setHasSchemaIssue(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to ensure loan data has all needed fields
  const ensureCompleteLoansData = async (loansData) => {
    if (!loansData || loansData.length === 0) return loansData;

    // Check if any loan is missing book_id
    const incompleteLoans = loansData.filter((loan) => !loan.book_id);

    if (incompleteLoans.length === 0) {
      // All loans have book_id, no need to fix
      return loansData;
    }

    console.log(
      `Found ${incompleteLoans.length} loans with missing book_id, fixing...`
    );

    // For each incomplete loan, get the book_copy and use it to find the book
    const fixedLoans = await Promise.all(
      loansData.map(async (loan) => {
        if (loan.book_id) return loan; // Already has book_id

        try {
          // Get the book copy to find its book_id
          const bookCopy = await window.api.getBookCopyById(loan.book_copy_id);
          if (!bookCopy) {
            console.error(
              `Could not find book copy with ID ${loan.book_copy_id}`
            );
            return loan;
          }

          // ... [rest of the original file content remains unchanged]
        } catch (error) {
          console.error("Error initializing direct book copy borrow:", error);
          setSnackbar({
            open: true,
            message: `Error: ${
              error.message || "Failed to initialize borrowing process"
            }`,
            severity: "error",
          });
        }
      })
    );

    return fixedLoans;
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredLoans = loans.filter(
    (loan) =>
      loan.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.book_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loan.book_isbn && loan.book_isbn.includes(searchTerm))
  );

  const handleOpenBorrowDialog = () => {
    // Reset to today and today + 14 days
    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    setSelectedMember(null);
    setSelectedBooks([]);
    setCheckoutDate(today);
    setDueDate(futureDateStr);
    setOpenBorrowDialog(true);
  };

  const handleCloseBorrowDialog = () => {
    setOpenBorrowDialog(false);
    // Reset the book copy ID when closing the dialog
    setSelectedBookCopyId("");
  };

  const handleOpenReturnDialog = () => {
    setSelectedLoans([]);
    setOpenReturnDialog(true);
  };

  const handleCloseReturnDialog = () => {
    setOpenReturnDialog(false);
  };

  // Handler for opening the multi-book return dialog
  const handleOpenMultiReturnDialog = () => {
    console.log('Opening multi-book return dialog');
    
    // First, prompt user to select a member
    if (!selectedMemberForReturn) {
      // Open the member select dialog first
      setOpenMemberSelectDialog(true);
      // Once a member is selected in handleMemberSelect, we'll set selectedMemberForReturn
      // and then we can continue to open the multi-return dialog
    } else {
      // We already have a selected member, open the dialog directly
      setMultiReturnDialogOpen(true);
    }
  };

  // Handler for closing the multi-book return dialog
  const handleCloseMultiReturnDialog = () => {
    console.log('Closing multi-book return dialog');
    setMultiReturnDialogOpen(false);
    // Reset the selected member
    setSelectedMemberForReturn(null);
  };

  // Handler for successful multiple book return
  const handleMultiReturnSuccess = (result) => {
    console.log('Multiple books returned successfully:', result);
    
    // Show success snackbar
    setSnackbar({
      open: true,
      message: `Successfully returned ${result.returns?.length || 0} books`,
      severity: "success",
    });
    
    // Refresh loan data
    fetchLoansByTab(activeTab);
  };

  // Handler for member selection for multi-book return
  const handleSelectMemberForReturn = (member) => {
    console.log('Selected member for return:', member);
    setSelectedMemberForReturn(member);
  };

  // Function to handle opening copy selection dialog
  const handleOpenCopySelectDialog = async () => {
    if (!selectedMember) {
      setSnackbar({
        open: true,
        message: "Please select a member first",
        severity: "error",
      });
      return;
    }

    if (selectedBooks.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one book",
        severity: "error",
      });
      return;
    }

    try {
      setLoadingCopies(true);
      // Fetch available copies for each selected book
      const copiesData = {};
      const bookCopiesPromises = selectedBooks.map(async (book) => {
        // Get ALL copies of the book, not just availability summary
        const copies = await window.api.getBookCopiesByBookId(book.id);
        return { book, copies };
      });

      const results = await Promise.all(bookCopiesPromises);

      // Organize by book
      results.forEach(({ book, copies }) => {
        // Filter to only include available copies
        const availableCopies = copies.filter(
          (copy) => copy.status === "Available"
        );

        if (availableCopies && availableCopies.length > 0) {
          copiesData[book.id] = {
            book,
            copies: availableCopies,
          };
        } else {
          // Include the book even if no copies are available
          copiesData[book.id] = {
            book,
            copies: [],
          };
        }
      });

      setAvailableCopiesByBook(copiesData);

      // Clear previous selections
      setSelectedBookCopies([]);

      // Open the dialog
      setOpenCopySelectDialog(true);
    } catch (error) {
      console.error("Error fetching book copies:", error);
      setSnackbar({
        open: true,
        message: `Error fetching available copies: ${error.message}`,
        severity: "error",
      });
    } finally {
      setLoadingCopies(false);
    }
  };

  // Function to handle closing copy selection dialog
  const handleCloseCopySelectDialog = () => {
    setOpenCopySelectDialog(false);
  };

  // Function to toggle selection of a book copy
  const handleToggleCopySelection = (copyId) => {
    setSelectedBookCopies((prev) => {
      if (prev.includes(copyId)) {
        return prev.filter((id) => id !== copyId);
      } else {
        return [...prev, copyId];
      }
    });
  };

  // Function to select all copies of a book
  const handleSelectAllCopiesOfBook = (bookId) => {
    const bookData = availableCopiesByBook[bookId];
    if (bookData && bookData.copies) {
      const copyIds = bookData.copies.map((copy) => copy.id);
      setSelectedBookCopies((prev) => {
        const filtered = prev.filter(
          (id) => !bookData.copies.some((copy) => copy.id === id)
        );
        return [...filtered, ...copyIds];
      });
    }
  };

  // Function to proceed with borrowing after copy selection
  const handleCompleteBorrowing = async () => {
    if (selectedBookCopies.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one book copy",
        severity: "error",
      });
      return;
    }

    try {
      const memberData = {
        member_id: selectedMember.id,
        book_copies: selectedBookCopies,
        checkout_date: checkoutDate,
        due_date: dueDate,
      };

      const result = await window.api.borrowBooks(memberData);

      // Generate a unique transaction ID for QR code
      const transactionId = `LOAN-${Date.now()}-${selectedMember.id}`;

      // Get book details for the receipt
      const booksForReceipt = [];
      for (const bookId in availableCopiesByBook) {
        const bookData = availableCopiesByBook[bookId];
        const selectedCopiesForThisBook = bookData.copies.filter((copy) =>
          selectedBookCopies.includes(copy.id)
        );

        if (selectedCopiesForThisBook.length > 0) {
          booksForReceipt.push(bookData.book);
        }
      }

      // Prepare receipt data
      const receiptInfo = {
        transactionId,
        member: selectedMember,
        books: booksForReceipt,
        bookCopies: selectedBookCopies,
        checkoutDate,
        dueDate,
        loansIds: Array.isArray(result) ? result.map((loan) => loan.id) : [],
      };

      setReceiptData(receiptInfo);

      // Generate QR code
      await generateQRData(receiptInfo);

      // Show receipt
      setOpenReceiptDialog(true);

      setSnackbar({
        open: true,
        message: `${selectedBookCopies.length} book copies borrowed successfully`,
        severity: "success",
      });

      // Close the copy select dialog
      setOpenCopySelectDialog(false);

      // Refresh the loans list
      fetchLoansByTab(activeTab);

      // Refresh available books
      const updatedBooks = await window.api.getAllBooks();
      setBooks(updatedBooks);

      // Close the borrow dialog
      setOpenBorrowDialog(false);

      // Reset state
      setSelectedMember(null);
      setSelectedBooks([]);
      setSelectedBookCopies([]);
    } catch (error) {
      console.error("Error borrowing books:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to borrow books"}`,
        severity: "error",
      });
    }
  };

  // Update the existing handleBorrowBooks function to call the copy selection dialog
  const handleBorrowBooks = async () => {
    if (!selectedMember) {
      setSnackbar({
        open: true,
        message: "Please select a member",
        severity: "error",
      });
      return;
    }

    if (selectedBookCopies.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one book copy",
        severity: "error",
      });
      return;
    }

    try {
      const memberData = {
        member_id: selectedMember.id,
        book_copies: selectedBookCopies,
        checkout_date: checkoutDate,
        due_date: dueDate,
      };

      const result = await window.api.borrowBooks(memberData);

      // Generate a unique transaction ID for QR code
      const transactionId = `LOAN-${Date.now()}-${selectedMember.id}`;

      // Get book details for the receipt
      const booksForReceipt = [];
      for (const bookId in availableCopiesByBook) {
        const bookData = availableCopiesByBook[bookId];
        const selectedCopiesForThisBook = bookData.copies.filter((copy) =>
          selectedBookCopies.includes(copy.id)
        );

        if (selectedCopiesForThisBook.length > 0) {
          booksForReceipt.push(bookData.book);
        }
      }

      // Prepare receipt data
      const receiptInfo = {
        transactionId,
        member: selectedMember,
        books: booksForReceipt,
        bookCopies: selectedBookCopies,
        checkoutDate,
        dueDate,
        loansIds: Array.isArray(result) ? result.map((loan) => loan.id) : [],
      };

      setReceiptData(receiptInfo);

      // Generate QR code
      await generateQRData(receiptInfo);

      // Show receipt
      setOpenReceiptDialog(true);

      setSnackbar({
        open: true,
        message: `${selectedBookCopies.length} book copies borrowed successfully`,
        severity: "success",
      });

      // Refresh the loans list
      fetchLoansByTab(activeTab);

      // Refresh available books
      const updatedBooks = await window.api.getAllBooks();
      setBooks(updatedBooks);

      // Close the borrow dialog
      setOpenBorrowDialog(false);

      // Reset state
      setSelectedMember(null);
      setSelectedBooks([]);
      setSelectedBookCopies([]);
      setAvailableCopiesByBook({});
    } catch (error) {
      console.error("Error borrowing books:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to borrow books"}`,
        severity: "error",
      });
    }
  };

  const handleReturnBooks = async () => {
    if (selectedLoans.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one book to return",
        severity: "error",
      });
      return;
    }

    try {
      console.log(`Attempting to return ${selectedLoans.length} books`);
      
      // Format the data for the API to handle multiple returns with conditions and notes
      const returnData = {
        returns: selectedLoans.map(loan => ({
          loan_id: loan.id,
          returnCondition: loan.returnCondition || 'Good', // Default to Good if not specified
          note: loan.note || ''
        }))
      };
      
      console.log('Return data:', returnData);
      
      const result = await window.api.returnBooks(returnData);
      
      if (result && result.success) {
      setSnackbar({
        open: true,
        message: `Successfully returned ${selectedLoans.length} book(s)`,
        severity: "success",
      });
      fetchLoansByTab(activeTab);
      setOpenReturnDialog(false);
      } else {
        throw new Error(result?.message || 'Failed to return books');
      }
    } catch (error) {
      console.error("Error returning books:", error);
      setSnackbar({
        open: true,
        message: `Error returning books: ${error.message}`,
        severity: "error",
      });
    }
  };

  // Handle returning a single book directly from the table
  const handleReturnSingleBook = async (loanId) => {
    try {
      console.log(`Returning loan with ID: ${loanId}`);
      
      // Get the loan first to check if it's part of a batch
      const loanData = loans.find(loan => loan.id === loanId);
      
      if (!loanData) {
        throw new Error(`Loan with ID ${loanId} not found`);
      }
      
      let confirmMessage = `Are you sure you want to return "${loanData.book_title}"?`;
      let successMessage = `Book "${loanData.book_title}" has been returned successfully`;
      
      // If it's a batch loan, adjust the message
      if (loanData.is_batch && loanData.total_books > 1) {
        confirmMessage = `Are you sure you want to return all ${loanData.total_books} books in this batch?`;
        successMessage = `${loanData.total_books} books have been returned successfully`;
      }
      
      // Ask for confirmation
      if (!window.confirm(confirmMessage)) {
        return;
      }

      const result = await window.api.returnBook({
        loan_id: loanId
      });

      if (result.success) {
      setSnackbar({
        open: true,
          message: successMessage,
        severity: "success",
      });

        // Refresh the loans list
      fetchLoansByTab(activeTab);
      } else {
        setSnackbar({
          open: true,
          message: result.message || "Error returning the book",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error returning book:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to return book"}`,
        severity: "error",
      });
    }
  };

  // Generate receipt for a single loan
  const handleGenerateReceipt = async (loan) => {
    try {
      if (!loan) {
        console.error("Error: Missing loan data");
        setSnackbar({
          open: true,
          message: "Error: Missing loan data",
          severity: "error",
        });
        return;
      }

      console.log("Generating receipt for loan:", loan);

      // Handle batch loans
      if (loan.is_batch) {
        // Create book objects array from batch loan data
        const books = loan.book_titles.map((title, index) => ({
          id: loan.book_ids[index],
          title: title,
          author: index === 0 ? loan.book_author : "", // Only first book has author info
          isbn: index === 0 ? loan.book_isbn : "",
          cover_color: index === 0 ? loan.book_color : "",
          front_cover: index === 0 ? loan.book_cover : "",
        }));

        // Create member object from loan data
        const member = {
          id: loan.member_id,
          name: loan.member_name,
          email: loan.member_email,
        };

        // Extract loan IDs for the batch
        let loanIds = [];
        if (loan.loan_ids && Array.isArray(loan.loan_ids)) {
          loanIds = loan.loan_ids;
        } else if (loan.id) {
          // If batch doesn't have separate loan_ids, use the batch loan ID
          loanIds = [loan.id];
        }

        // Prepare receipt data
        const receiptInfo = {
          transactionId: loan.transaction_id || `LOAN-${Date.now()}-${loan.member_id}`,
          member: member,
          checkoutDate: loan.checkout_date,
          dueDate: loan.due_date,
          books: books,
          bookCopies: loan.book_copy_ids ? loan.book_copy_ids.map((id, index) => ({
            id: id,
            barcode: loan.book_barcodes ? loan.book_barcodes[index] || `N/A` : 'N/A',
            locationCode: "", // Batch loans may not have this detail
          })) : [],
          is_batch: true,
          total_books: loan.total_books,
          loansIds: loanIds // Include the actual loan IDs
        };

        setReceiptData(receiptInfo);

        // Generate QR code data
        await generateQRData(receiptInfo);

        // Show receipt
        setOpenReceiptDialog(true);
        return;
      }

      // Handle single book loan (original code)
      // Create book object from loan data
      const book = {
        id: loan.book_id,
        title: loan.book_title,
        author: loan.book_author,
        isbn: loan.book_isbn,
        cover_color: loan.book_color,
        front_cover: loan.book_cover,
      };

      // Create member object from loan data
      const member = {
        id: loan.member_id,
        name: loan.member_name,
        email: loan.member_email,
      };

      // Prepare receipt data
      const receiptInfo = {
        transactionId: loan.transaction_id || `LOAN-${Date.now()}-${loan.member_id}`,
        member: member,
        checkoutDate: loan.checkout_date,
        dueDate: loan.due_date,
        books: [book],
        bookCopies: [
          {
            id: loan.book_copy_id,
            barcode: loan.book_barcode,
            locationCode: loan.book_location_code,
          },
        ],
        // Critical: Include the actual loan ID for returns
        loansIds: [loan.id]
      };

      console.log("Receipt data with loan ID:", receiptInfo);

      setReceiptData(receiptInfo);

      // Generate QR code data
      await generateQRData(receiptInfo);

      // Show receipt
      setOpenReceiptDialog(true);
    } catch (error) {
      console.error("Error generating receipt:", error);
      setSnackbar({
        open: true,
        message: `Error generating receipt: ${
          error.message || "Unknown error"
        }`,
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getAvailableBooks = () => {
    return books.filter((book) => book.status === "Available");
  };

  const getBookCoverDisplay = (book) => {
    if (!book) return null;

    if (book.front_cover) {
      return (
        <Box
          component="img"
          src={book.front_cover}
          alt={`Cover for ${book.title}`}
          sx={{
            width: 30,
            height: 45,
            objectFit: "cover",
            borderRadius: 1,
            mr: 1,
          }}
        />
      );
    } else {
      return (
        <Box
          sx={{
            width: 30,
            height: 45,
            bgcolor: book.cover_color || "#6B4226",
            borderRadius: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            fontSize: "7px",
            textAlign: "center",
            lineHeight: 1,
            p: 0.3,
            mr: 1,
          }}
        >
          {book.title}
        </Box>
      );
    }
  };

  const isLoanOverdue = (loan) => {
    // If the loan is already marked as Overdue, return true
    if (loan.status === 'Overdue') return true;
    
    // If the loan has been returned, it's not overdue
    if (loan.status === 'Returned') return false;
    
    // Otherwise check the due date
    if (!loan.due_date) return false;
    const today = new Date();
    const dueDate = new Date(loan.due_date);
    return dueDate < today;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
    const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      
      // Format date as "MMM DD, YYYY" (e.g., "Jan 01, 2023")
      const options = { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit' 
      };
      
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString || "N/A";
    }
  };

  const renderLoanStatus = (loan) => {
    // If the loan is overdue based on due date, show Overdue regardless of status
    if (isLoanOverdue(loan) && loan.status !== 'Returned') {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Overdue"
          color="error"
          size="small"
        />
      );
    }
    
    // Handle different status values
    switch(loan.status) {
      case 'Checked Out':
      case 'Borrowed':
        return <Chip label="Checked Out" color="primary" size="small" />;
      case 'Overdue':
        return (
          <Chip
            icon={<WarningIcon />}
            label="Overdue"
            color="error"
            size="small"
          />
        );
      case 'Returned':
        return <Chip label="Returned" color="success" size="small" />;
      default:
    return <Chip label={loan.status} color="primary" size="small" />;
    }
  };

  const handleCheckoutDateChange = (e) => {
    const newCheckoutDate = e.target.value;
    setCheckoutDate(newCheckoutDate);

    // Update due date to be 14 days after checkout date
    const checkoutDateObj = new Date(newCheckoutDate);
    const newDueDate = new Date(checkoutDateObj);
    newDueDate.setDate(newDueDate.getDate() + 14);
    setDueDate(newDueDate.toISOString().split("T")[0]);
  };

  const handleOpenMemberSelectDialog = () => {
    setMemberSearchTerm("");
    setOpenMemberSelectDialog(true);
  };

  const handleCloseMemberSelectDialog = () => {
    setOpenMemberSelectDialog(false);
  };

  // Update the handleOpenBookSelectDialog to directly show copies after book selection
  const handleOpenBookSelectDialog = () => {
    setOpenBookSelectDialog(true);
  };

  // Update the handleBookSelect to immediately fetch available copies
  const handleBookSelect = async (book) => {
    // Add the book to selectedBooks
    setSelectedBooks((prev) => {
      // Check if book is already selected
      if (prev.some((b) => b.id === book.id)) {
        return prev;
      }
      return [...prev, book];
    });

    // Immediately after selecting a book, fetch its available copies
    try {
      setLoadingCopies(true);
      // Get ALL copies of the book
      const copies = await window.api.getBookCopiesByBookId(book.id);

      // Filter to only available copies
      const availableCopies = copies.filter(
        (copy) => copy.status === "Available"
      );

      // Update the availableCopiesByBook state
      setAvailableCopiesByBook((prev) => ({
        ...prev,
        [book.id]: {
          book,
          copies: availableCopies || [],
        },
      }));
    } catch (error) {
      console.error("Error fetching book copies:", error);
      setSnackbar({
        open: true,
        message: `Error fetching available copies: ${error.message}`,
        severity: "error",
      });
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleCloseBookSelectDialog = () => {
    setOpenBookSelectDialog(false);
  };

  const handleMemberSelect = (member) => {
    if (openBorrowDialog) {
      // This is for the borrow flow
    setSelectedMember(member);
    setOpenMemberSelectDialog(false);
    } else {
      // This is for the multi-return flow
      setSelectedMemberForReturn(member);
      setOpenMemberSelectDialog(false);
      
      // Now that we have a member, open the multi-return dialog
      setMultiReturnDialogOpen(true);
    }
  };

  const handleRemoveBook = (bookId) => {
    // Remove the book from selectedBooks array
    setSelectedBooks(selectedBooks.filter((book) => book.id !== bookId));

    // Also remove any selected copies from this book
    if (availableCopiesByBook[bookId]?.copies) {
      const copyIdsToRemove = availableCopiesByBook[bookId].copies.map(
        (copy) => copy.id
      );
      setSelectedBookCopies((prev) =>
        prev.filter((copyId) => !copyIdsToRemove.includes(copyId))
      );
    }

    // Remove the book's entries from availableCopiesByBook
    setAvailableCopiesByBook((prev) => {
      const newState = { ...prev };
      delete newState[bookId];
      return newState;
    });
  };

  const handleMemberSearchChange = (event) => {
    setMemberSearchTerm(event.target.value);
  };

  const handleBookSearchChange = (event) => {
    setBookSearchTerm(event.target.value);
  };

  const filteredMembers = members.filter(
    (member) =>
      member.status === "Active" &&
      (member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearchTerm.toLowerCase()))
  );

  const filteredAvailableBooks = getAvailableBooks().filter(
    (book) =>
      book.title.toLowerCase().includes(bookSearchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(bookSearchTerm.toLowerCase()) ||
      (book.isbn &&
        book.isbn.toLowerCase().includes(bookSearchTerm.toLowerCase()))
  );

  const handleCloseReceiptDialog = () => {
    setOpenReceiptDialog(false);
  };

  const handlePrintReceipt = () => {
    if (receiptRef.current) {
      const printContent = receiptRef.current;

      const printWindow = window.open("", "_blank");
      printWindow.document.write("<html><head><title>Loan Receipt</title>");
      printWindow.document.write("<style>");
      printWindow.document.write(`
        /* Thermal printer optimized styles */
        @page {
          size: 80mm auto; /* Standard thermal paper width */
          margin: 0;
        }
        body {
          font-family: 'Courier New', monospace; /* Standard for thermal printers */
          font-size: 12px;
          width: 80mm;
          padding: 5mm;
          margin: 0 auto;
        }
        .receipt {
          width: 100%;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 10px;
        }
        .library-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 3px;
        }
        .receipt-title {
          font-size: 14px;
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 5px;
        }
        .qr-section {
          text-align: center;
          margin: 10px 0;
        }
        .member-details, .loan-details {
          margin-bottom: 10px;
        }
        h3 {
          font-size: 13px;
          margin: 5px 0;
          border-bottom: 1px solid #000;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .book-list {
          margin-top: 5px;
        }
        .book-item {
          padding: 3px 0;
          border-bottom: 1px dotted #ccc;
        }
        .footer {
          margin-top: 15px;
          font-size: 11px;
          text-align: center;
          border-top: 1px dashed #000;
          padding-top: 5px;
        }
        .due-date {
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 11px;
        }
        th, td {
          padding: 4px;
          text-align: left;
          border-bottom: 1px dotted #ddd;
        }
        th {
          font-weight: bold;
        }
        @media print {
          body {
            width: 100%;
            padding: 0;
          }
          button { display: none; }
        }
      `);
      printWindow.document.write("</style></head><body>");
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write("</body></html>");

      printWindow.document.close();
      printWindow.focus();

      // Print after a short delay to ensure content is rendered
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // Find the generateQRData function and modify it to handle content security policy restrictions
  const generateQRData = async (data) => {
    if (!data) {
      console.error("No data provided for QR code generation");
      return "";
    }

    try {
      // Validate required data
      if (!data.transactionId || !data.member || !data.member.id) {
        console.error("Missing required data for QR code generation:", data);
        throw new Error("Incomplete receipt data");
      }

      // Make sure we have valid loan IDs - critical for return functionality
      let validLoanIds = [];
      
      // First priority: Check for loansIds directly in the data (explicitly included)
      if (data.loansIds && Array.isArray(data.loansIds)) {
        console.log("Processing loansIds from data:", data.loansIds);
        validLoanIds = data.loansIds
          .filter(id => id && !isNaN(Number(id)))
          .map(id => Number(id));
          
        console.log("Valid loan IDs extracted:", validLoanIds);
      }
      
      // If no valid loansIds found, check for alternative sources
      if (validLoanIds.length === 0) {
        // Check if the loan ID might be on the root level (direct property)
        if (data.id && !isNaN(Number(data.id))) {
          console.log("Using loan ID from root data:", data.id);
          validLoanIds = [Number(data.id)];
        }
        // Otherwise check if we have bookCopies data and we're generating from an active loan
        else if (data.bookCopies && Array.isArray(data.bookCopies) && data.bookCopies.length > 0) {
          console.log("No loan IDs found, attempting to find loan information from book copies:", data.bookCopies);
          
          // IMPORTANT: We should NOT use book_copy_ids as loan IDs
          // This is not correct and causes errors when trying to return books
          // Instead, we'll log this as a warning
          console.warn("Warning: Unable to find valid loan IDs for QR code. Borrowing receipts should include loan IDs.");
        }
      }

      // Determine if this is a batch loan
      const isBatch = (validLoanIds.length > 1) || data.is_batch || (data.total_books && data.total_books > 1);
      
      if (isBatch) {
        console.log("Generating QR code for a batch loan with multiple books");
      }

      // Create a more streamlined QR data structure with only essential information
      // This reduces QR code complexity and makes it more scannable
      const qrData = {
        t: data.transactionId, // Short key name to reduce QR code complexity
        m: data.member.id,     // Just store the ID, not the entire member object
        l: validLoanIds,       // Always include loan IDs for returns (may be empty if not found)
        type: "receipt",       // Keep type for identification
        batch: isBatch         // Explicitly mark as batch loan when applicable
      };

      // Log the QR data being encoded
      console.log("Generating QR code with data:", qrData);
      if (validLoanIds.length === 0) {
        console.warn("WARNING: No valid loan IDs in QR code - returns may not work correctly");
      }

      // Generate QR code as data URL with enhanced settings for better scanning
      try {
        // First try to use the standard QR code generation
        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 300,          // Increased size for better scanning
          margin: 4,           // Slightly larger margin for better scanning
          errorCorrectionLevel: "H", // High error correction level for better scanning reliability
          scale: 8,            // Higher scale for sharper QR codes
          color: {
            dark: "#000000",   // Pure black
            light: "#ffffff",  // Pure white for maximum contrast
          },
        });

        console.log("QR code generated successfully");

        // Create a workaround for Content Security Policy restrictions
        // Create a Blob from the data URL and create an Object URL
        const base64Data = qrDataUrl.split(",")[1];
        if (base64Data) {
          const byteCharacters = atob(base64Data);
          const byteArrays = [];

          for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays.push(byteCharacters.charCodeAt(i));
          }

          const byteArray = new Uint8Array(byteArrays);
          const blob = new Blob([byteArray], { type: "image/png" });
          const blobUrl = URL.createObjectURL(blob);

          // Use the blob URL which is allowed by default CSP
          setQrCodeData(blobUrl);
          return blobUrl;
        } else {
          throw new Error("Failed to extract base64 data from QR code");
        }
      } catch (qrError) {
        console.error("Error in QR code generation:", qrError);
        throw qrError;
      }
    } catch (error) {
      console.error("Error generating QR code:", error);

      // Generate a fallback QR code with minimal data
      try {
        // Extremely simplified data for fallback - just the transaction ID
        const fallbackData = {
          t: data.transactionId || `RECEIPT-${Date.now()}`,
          m: data.member?.id || 0,
          type: "receipt"
        };

        const fallbackQr = await QRCode.toDataURL(
          JSON.stringify(fallbackData),
          {
            width: 300,
            margin: 4,
            errorCorrectionLevel: "H", // Still use high correction for fallback
            scale: 8,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          }
        );

        // Convert to blob URL for CSP compliance
        const base64Data = fallbackQr.split(",")[1];
        if (base64Data) {
          const byteCharacters = atob(base64Data);
          const byteArrays = [];

          for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays.push(byteCharacters.charCodeAt(i));
          }

          const byteArray = new Uint8Array(byteArrays);
          const blob = new Blob([byteArray], { type: "image/png" });
          const blobUrl = URL.createObjectURL(blob);

          console.log("Generated fallback QR code using blob URL");
          setQrCodeData(blobUrl);

          // Show warning but don't block receipt display
          setSnackbar({
            open: true,
            message: "QR code generated with minimal data for better scanning",
            severity: "warning",
          });

          return blobUrl;
        } else {
          throw new Error(
            "Failed to extract base64 data from fallback QR code"
          );
        }
      } catch (fallbackError) {
        console.error("Failed to generate fallback QR code:", fallbackError);
        setQrCodeData("");
        return "";
      }
    }
  };

  const stopQRScanner = () => {
    console.log("Stopping QR scanner");
    
    // Don't try to stop if already stopped
    if (!qrScannerActive) {
      console.log("Scanner already stopped");
      return;
    }
    
    setQRScannerActive(false);
    
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
    
    // Also clean up any remaining camera streams
    if (currentStreamRef.current) {
      try {
        currentStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.log("Error stopping track:", e);
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        
        currentStreamRef.current = null;
      } catch (e) {
        console.log("Error cleaning up media stream:", e);
      }
    }
    
    // Clean up any remaining video elements in the container
    try {
      if (qrScannerContainerRef.current) {
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
      }
    } catch (e) {
      console.log("Error cleaning up video elements:", e);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeScannerRef.current || !torchAvailable) return;

    try {
      const newTorchState = !torchActive;
      
      if (newTorchState) {
        await html5QrCodeScannerRef.current.torch(true);
        console.log("Torch turned ON");
      } else {
        await html5QrCodeScannerRef.current.torch(false);
        console.log("Torch turned OFF");
      }

      setTorchActive(newTorchState);
    } catch (error) {
      console.error("Error toggling torch:", error);
      setSnackbar({
        open: true,
        message: "Failed to toggle flashlight",
        severity: "error",
      });
    }
  };

  const handleCloseQRScannerDialog = () => {
    setOpenQRScannerDialog(false);
    stopQRScanner();
  };

  const startQRScanner = async () => {
    if (!qrScannerContainerRef.current) return;
    
    // Clear previous instance
    if (html5QrCodeScannerRef.current) {
      await stopQRScanner();
      // Clear container for new instance
      qrScannerContainerRef.current.innerHTML = '';
    }
    
    setScannerResult("Starting camera...");
    setQRScannerActive(true);
    
    try {
      // Create scanner instance
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeScannerRef.current = html5QrCode;
      
      // Define the success callback
      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        console.log(`QR Code detected: ${decodedText}`, decodedResult);
        
        // Set scanner as inactive first to prevent multiple attempts to stop
        setQRScannerActive(false);
        
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
      
      // Enhanced error handling function for QR code scanning errors
      const qrCodeErrorCallback = (errorMessage, exception) => {
        // Most of these errors are just frame-by-frame failures to detect, not actual errors
        // So we only log real issues
        if (exception && exception.name !== "NotFoundException") {
          console.error("QR Scanner error:", errorMessage, exception);
          
          // Only show errors that are actual problems, not just "QR code not found in this frame"
          if (exception.name === "NotReadableError") {
            setScannerResult("Error: Cannot access camera stream");
          } else if (exception.name === "NotAllowedError") {
            setScannerResult("Error: Camera permission denied");
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
      
      setScannerResult("Camera active! Position the QR code in the scanning area.");
      
      // Check if torch is available
      try {
        const torchCompatible = await html5QrCode.isTorchAvailable();
        setTorchAvailable(torchCompatible);
        console.log("Torch available:", torchCompatible);
      } catch (error) {
        console.log("Error checking torch availability:", error);
        setTorchAvailable(false);
      }
      
    } catch (error) {
      console.error("Error starting QR scanner:", error);
      setQRScannerActive(false);
      
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
            startQRScanner();
          }, 500);
        }
      }
      
      setScannerResult(`Error: ${errorMessage}`);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
      
      // Show the direct input form as a fallback
      setShowDirectLoanInput(true);
    }
  };

  const handleCameraChange = (event) => {
    setSelectedCamera(event.target.value);

    // If scanner is already active, restart it with the new camera
    if (qrScannerActive) {
      stopQRScanner();
      // Short delay to ensure camera is fully stopped
      setTimeout(() => {
        startQRScanner();
      }, 300);
    }
  };

  // Add state for direct loan entry
  const [showDirectLoanInput, setShowDirectLoanInput] = useState(true);
  const [directLoanId, setDirectLoanId] = useState("");

  const handleDirectLoanReturn = async () => {
    if (!directLoanId.trim() || !/^\d+$/.test(directLoanId.trim())) {
      setSnackbar({
        open: true,
        message: "Please enter a valid loan ID (numbers only)",
        severity: "error",
      });
      return;
    }

    setScannerResult("Processing loan return...");

    try {
      // Format the data for the API
      const data = JSON.stringify({
        loansIds: [parseInt(directLoanId.trim())],
      });

      const result = await window.api.returnBooksViaQR(data);

      if (result.success) {
        setScannerResult(result.message);
        setSnackbar({
          open: true,
          message: result.message,
          severity: "success",
        });

        // Refresh the loans list
        setTimeout(() => {
          fetchLoansByTab(activeTab);
          setDirectLoanId("");
          handleCloseQRScannerDialog();
        }, 2000);
      } else {
        setScannerResult(`Error: ${result.message}`);
        setSnackbar({
          open: true,
          message: result.message,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error processing loan return:", error);
      setScannerResult("Failed to process loan return");
      setSnackbar({
        open: true,
        message: "Failed to process loan return",
        severity: "error",
      });
    }
  };

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
        setScannerResult("No cameras detected on your device. Please try manual entry.");
      }
    } catch (error) {
        console.error("Error enumerating devices:", error);
      setScannerResult("Failed to detect cameras. Try manual entry instead.");
    }
  };

  const handleOpenQRScannerDialog = () => {
    setOpenQRScannerDialog(true);
    setScannerResult(null);
    setManualQRInput('');

    // Get available camera devices
    getCameraDevices();
  };

  // Add a new function to repair the database
  const handleRepairDatabase = async () => {
    setIsRepairing(true);
    try {
      // Update the loans table schema
      const loansTableResult = await window.api.updateLoansTable();
      if (!loansTableResult.success) {
        throw new Error(
          loansTableResult.message || "Failed to update loans table"
        );
      }

      // Update book copies table schema
      const bookCopiesResult = await window.api.updateBookCopiesTable();
      if (!bookCopiesResult.success) {
        throw new Error(
          bookCopiesResult.message || "Failed to update book copies table"
        );
      }

      // Call our new repair function to fix missing book_id fields
      try {
        const repairResult = await window.api.repairDatabase();
        console.log("Database repair result:", repairResult);

        if (repairResult && repairResult.success) {
          console.log(
            `Updated ${
              repairResult.updatedLoans?.length || 0
            } loans with book details`
          );
        }
      } catch (repairError) {
        console.error("Error during loan data repair:", repairError);
        // Continue with the process even if this specific repair fails
      }

      // Clear the schema issue flag
      setHasSchemaIssue(false);

      setSnackbar({
        open: true,
        message: "Database successfully updated. Reloading data...",
        severity: "success",
      });

      // Reload data using the existing fetchLoansByTab function
      await fetchLoansByTab(activeTab);

      // Also refresh the members and books lists
      const membersData = await window.api.getAllMembers();
      setMembers(membersData);

      const booksData = await window.api.getAllBooks();
      setBooks(booksData);
    } catch (error) {
      console.error("Error repairing database:", error);
      setSnackbar({
        open: true,
        message:
          "Failed to repair database: " + (error.message || "Unknown error"),
        severity: "error",
      });
      setHasSchemaIssue(true);
    } finally {
      setIsRepairing(false);
    }
  };

  // Function to handle QR code popup
  const handleShowQRCode = async (loan, event) => {
    try {
      if (!loan || !loan.id) {
        console.error("Error: Missing loan data or invalid loan ID");
        setSnackbar({
          open: true,
          message: "Error: Missing loan data",
          severity: "error",
        });
        return;
      }

      console.log("Generating QR code for loan:", loan.id);

      // Create loan QR data with more robust data
      const qrData = {
        transactionId: `LOAN-${Date.now()}-${loan.member_id || "unknown"}`,
        loanId: loan.id,
        bookId: loan.book_id || "unknown",
        memberId: loan.member_id || "unknown",
        checkoutDate: loan.checkout_date || new Date().toISOString(),
        type: "loan_record",
      };

      // Generate QR code with error handling
      try {
        const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 150,
          margin: 1,
          errorCorrectionLevel: "H", // Highest error correction capability
          color: {
            dark: "#000",
            light: "#FFF",
          },
        });

        // Convert data URL to blob URL for CSP compliance
        const base64Data = qrCodeUrl.split(",")[1];
        if (base64Data) {
          const byteCharacters = atob(base64Data);
          const byteArrays = [];

          for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays.push(byteCharacters.charCodeAt(i));
          }

          const byteArray = new Uint8Array(byteArrays);
          const blob = new Blob([byteArray], { type: "image/png" });
          const blobUrl = URL.createObjectURL(blob);

          setCurrentLoanQR(blobUrl);
          setQrPopoverAnchor(event.currentTarget);
        } else {
          throw new Error("Failed to extract base64 data from QR code");
        }
      } catch (qrError) {
        console.error("QR generation error:", qrError);
        // Create a simpler fallback QR with less data
        const fallbackData = { loanId: loan.id, type: "loan_record" };
        const fallbackQR = await QRCode.toDataURL(
          JSON.stringify(fallbackData),
          {
            width: 150,
            margin: 1,
            errorCorrectionLevel: "L", // Lower complexity for fallback
          }
        );

        // Convert to blob URL
        const base64Data = fallbackQR.split(",")[1];
        if (base64Data) {
          const byteCharacters = atob(base64Data);
          const byteArrays = [];

          for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays.push(byteCharacters.charCodeAt(i));
          }

          const byteArray = new Uint8Array(byteArrays);
          const blob = new Blob([byteArray], { type: "image/png" });
          const blobUrl = URL.createObjectURL(blob);

          setCurrentLoanQR(blobUrl);
          setQrPopoverAnchor(event.currentTarget);
        }

        // Inform user but still show the QR
        setSnackbar({
          open: true,
          message: "QR code generated with limited data",
          severity: "warning",
        });
      }
    } catch (error) {
      console.error("Error showing QR code:", error);
      setSnackbar({
        open: true,
        message: "Error showing QR: " + (error.message || "Unknown error"),
        severity: "error",
      });
    }
  };

  const handleCloseQRPopover = () => {
    setQrPopoverAnchor(null);
  };

  // Add a function to handle batch returns directly from the loans list
  const handleOpenBatchReturnDialog = async (loan) => {
    try {
      setLoadingBatchLoans(true);
      console.log("Preparing batch return for loan:", loan);
      
      if (!loan || (!loan.id && !loan.member_id)) {
        throw new Error("Invalid loan data");
      }
      
      let loanId = loan.id;
      let memberId = loan.member_id;
      
      // If loan is not a batch loan but we're using the batch return feature,
      // we'll need to check if it's part of a batch
      let loanDetails;
      
      try {
        console.log(`Fetching details for loan ID ${loanId}`);
        loanDetails = await window.api.getLoanDetails(loanId);
        console.log("Loan details:", loanDetails);
      } catch (error) {
        console.error(`Error fetching loan details for ${loanId}:`, error);
        // Continue anyway - we'll try to get member loans instead
      }
      
      // If the loan is a batch loan, handle it directly
      if (loanDetails && loanDetails.is_batch) {
        console.log(`Loan ${loanId} is a batch loan with ${loanDetails.total_books} books`);
        
        // Process the batch loan details to build the batch return UI
        const batchItems = [];
        
        // If we have individual loan IDs and their statuses, use them to filter
        const individualLoans = [];
        
        // Try to find all individual loans first (if available)
        if (loanDetails.loan_ids && loanDetails.loan_ids.length > 0) {
          // For each individual loan ID, try to get details to check if it's been returned
          for (let i = 0; i < loanDetails.loan_ids.length; i++) {
            try {
              const individualId = loanDetails.loan_ids[i];
              if (!individualId) continue;
              
              // Try to get the loan status if possible
              let individualStatus = 'Unknown';
              try {
                const individualDetails = await window.api.getLoanDetails(individualId);
                individualStatus = individualDetails ? individualDetails.status : 'Unknown';
                
                // Only include the loan if it hasn't been returned
                if (individualStatus !== 'Returned') {
                  individualLoans.push({
                    id: individualId,
                    index: i,
                    status: individualStatus,
                    details: individualDetails
                  });
                } else {
                  console.log(`Skipping loan ${individualId} as it has status: ${individualStatus}`);
                }
              } catch (e) {
                console.log(`Couldn't fetch status for loan ${individualId}, will check main batch status:`, e);
                // If we can't determine individual status, include it (we'll filter by the batch status later)
                individualLoans.push({
                  id: individualId,
                  index: i,
                  status: loanDetails.status || 'Unknown'
                });
              }
            } catch (error) {
              console.error(`Error processing individual loan at index ${i}:`, error);
            }
          }
        }
        
        console.log(`Found ${individualLoans.length} potential active individual loans within the batch`);
        
        if (individualLoans.length > 0) {
          // Process only the active individual loans
          for (const individualLoan of individualLoans) {
            const i = individualLoan.index;
            
            // Only include loans that are not returned
            if (individualLoan.status !== 'Returned') {
              batchItems.push({
                loanId: loanDetails.id,
                individualId: individualLoan.id,
                bookCopyId: loanDetails.book_copy_ids ? loanDetails.book_copy_ids[i] : null,
                title: loanDetails.book_titles[i],
                barcode: loanDetails.book_barcodes ? loanDetails.book_barcodes[i] : 'N/A',
                author: loanDetails.book_authors ? loanDetails.book_authors[i] : (loanDetails.book_author || ''),
                cover: loanDetails.book_covers ? loanDetails.book_covers[i] : (loanDetails.book_cover || null),
                coverColor: loanDetails.book_colors ? loanDetails.book_colors[i] : (loanDetails.book_color || null),
                isbn: loanDetails.book_isbns ? loanDetails.book_isbns[i] : (loanDetails.book_isbn || ''),
                status: individualLoan.status
              });
            }
          }
        } else {
          // Fallback: if we don't have individual statuses, use the main batch status
          // but only if the main batch status is not 'Returned'
          if (loanDetails.status !== 'Returned' && loanDetails.book_titles && Array.isArray(loanDetails.book_titles)) {
            console.log('No individual loan statuses found, using batch status:', loanDetails.status);
            
            for (let i = 0; i < loanDetails.book_titles.length; i++) {
              // For books in a batch, use individual loan IDs if available
              const individualId = loanDetails.loan_ids && loanDetails.loan_ids[i] 
                ? loanDetails.loan_ids[i] 
                : null;
              
              batchItems.push({
                loanId: loanDetails.id,
                individualId: individualId,
                bookCopyId: loanDetails.book_copy_ids ? loanDetails.book_copy_ids[i] : null,
                title: loanDetails.book_titles[i],
                barcode: loanDetails.book_barcodes ? loanDetails.book_barcodes[i] : 'N/A',
                author: loanDetails.book_authors ? loanDetails.book_authors[i] : (loanDetails.book_author || ''),
                cover: loanDetails.book_covers ? loanDetails.book_covers[i] : (loanDetails.book_cover || null),
                coverColor: loanDetails.book_colors ? loanDetails.book_colors[i] : (loanDetails.book_color || null),
                isbn: loanDetails.book_isbns ? loanDetails.book_isbns[i] : (loanDetails.book_isbn || ''),
                status: loanDetails.status
              });
            }
          }
        }
        
        if (batchItems.length === 0) {
          throw new Error('No available books to return in this batch loan. All books in this batch may have already been returned.');
        }
        
        console.log('Prepared batch items for return:', batchItems);
        
        // Set the batch items and open the dialog
        setBatchLoansToReturn(batchItems);
        
        // By default, select all items
        setSelectedBatchItems(batchItems.map(item => 
          item.individualId || item.loanId
        ));
        
        // Open the batch return dialog
        setBatchReturnDialogOpen(true);
      } 
      // If not a batch loan or couldn't fetch loan details, try to get all member loans
      else if (memberId) {
        console.log(`Getting all loans for member ${memberId}`);
        try {
          const memberLoans = await window.api.getLoansByMember(memberId);
          console.log(`Found ${memberLoans.length} loans for member ${memberId}`);
          
          // Filter to only include active loans from the same transaction
          let relevantLoans = [];
          
          // If we have a transaction ID, use it to find related loans
          if (loan.transaction_id) {
            relevantLoans = memberLoans.filter(l => 
              l.status !== 'Returned' && 
              l.transaction_id === loan.transaction_id
            );
            console.log(`Found ${relevantLoans.length} active loans with transaction ID ${loan.transaction_id}`);
          } 
          // Otherwise, just use the original loan if it's active
          else if (loan.status !== 'Returned') {
            relevantLoans = [loan];
          }
          // If the original loan was returned, look for other active loans for this member
          else {
            relevantLoans = memberLoans.filter(l => l.status !== 'Returned');
            console.log(`Found ${relevantLoans.length} active loans for member ${memberId}`);
          }
          
          if (relevantLoans.length === 0) {
            throw new Error('No active loans found for this member. All books may have already been returned.');
          }
          
          // Handle multiple loans using the batch return handler
          const loanIds = relevantLoans.map(l => l.id);
          console.log(`Forwarding to batch handler with loan IDs: ${loanIds.join(', ')}`);
          await handleBatchReturnFromQRCode(loanIds, memberId);
        } catch (memberError) {
          console.error(`Error getting member loans:`, memberError);
          throw new Error(`Could not find active loans: ${memberError.message}`);
        }
      } else {
        throw new Error('Could not find enough information to process this loan.');
      }
    } catch (error) {
      console.error("Error preparing batch return:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: "error"
      });
    } finally {
      setLoadingBatchLoans(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: "var(--secondary-dark)" }}
        >
          Loan Management
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<LibraryBooksIcon />}
            onClick={handleOpenBorrowDialog}
            sx={{
              mr: 2,
              bgcolor: "var(--primary)",
              "&:hover": {
                bgcolor: "var(--primary-dark)",
              },
            }}
          >
            Borrow Books
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ReturnIcon />}
            onClick={handleOpenReturnDialog}
            sx={{ mr: 2 }}
          >
            Return Books
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AssignmentReturnedIcon />}
            onClick={handleOpenMultiReturnDialog}
            sx={{ mr: 2 }}
          >
            Return Multiple Books
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<QrCodeScannerIcon />}
            onClick={handleOpenQRScannerDialog}
          >
            Scan QR
          </Button>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<LibraryBooksIcon />} label="Active Loans" />
          <Tab icon={<WarningIcon />} label="Overdue" />
          <Tab icon={<EventNoteIcon />} label="All Loans" />
        </Tabs>
      </Paper>

      <Paper elevation={3} sx={{ mb: 4, p: 2, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by member name, book title or ISBN..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: "var(--secondary-dark)" }}>
            <TableRow>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Book
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Copy Details
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Member
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Checkout Date
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Due Date
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Status
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLoans.length > 0 ? (
              filteredLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box sx={{ mr: 1 }}>
                        {/* For batch loans with multiple books */}
                        {loan.is_batch ? (
                          <Box
                            sx={{
                              width: 40,
                              height: 60,
                              bgcolor: "#2196f3", // Blue color for batch loans
                              borderRadius: 1,
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "16px",
                            }}
                          >
                            {loan.total_books}
                          </Box>
                        ) : loan.book_cover ? (
                          <Box
                            component="img"
                            src={loan.book_cover}
                            alt={`Cover for ${loan.book_title}`}
                            sx={{
                              width: 40,
                              height: 60,
                              objectFit: "cover",
                              borderRadius: 1,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 40,
                              height: 60,
                              bgcolor: loan.book_color || "#6B4226",
                              borderRadius: 1,
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              color: "#fff",
                              fontSize: "8px",
                              textAlign: "center",
                              lineHeight: 1,
                              p: 0.5,
                            }}
                          >
                            {loan.book_title}
                          </Box>
                        )}
                      </Box>
                      <Box>
                        <Typography variant="body1">
                          {loan.book_title}
                        </Typography>
                        {loan.is_batch ? (
                          <Typography variant="caption" color="primary">
                            Batch borrowing of {loan.total_books} books
                          </Typography>
                        ) : (
                        <Typography variant="caption" color="textSecondary">
                          ISBN: {loan.book_isbn}
                        </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {loan.is_batch ? (
                      <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                        Multiple books ({loan.total_books})
                      </Typography>
                    ) : (
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      Barcode: {loan.book_barcode}
                    </Typography>
                    )}
                    {!loan.is_batch && (
                    <Typography variant="caption" color="textSecondary">
                      Location: {loan.book_location_code}
                    </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1">{loan.member_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {loan.member_email}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(loan.checkout_date)}</TableCell>
                  <TableCell
                    sx={{
                      color: isLoanOverdue(loan) ? "error.main" : "inherit",
                    }}
                  >
                    {formatDate(loan.due_date)}
                  </TableCell>
                  <TableCell>{renderLoanStatus(loan)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title="Print Receipt">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            console.log("Generating receipt for loan:", loan);
                            handleGenerateReceipt(loan);
                          }}
                        >
                          <ReceiptIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Show QR Code">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={(e) => {
                            console.log("Showing QR for loan:", loan);
                            handleShowQRCode(loan, e);
                          }}
                        >
                          <QrCodeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {loan.status !== "Returned" && (
                        <Tooltip title="Return Book">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              console.log("Returning loan:", loan);
                              handleReturnSingleBook(loan.id);
                            }}
                          >
                            <AssignmentReturnedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {/* Add batch return option for batch loans */}
                      {loan.status !== "Returned" && loan.is_batch && (
                        <Tooltip title="Batch Return (select books)">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => {
                              console.log("Opening batch return for loan:", loan);
                              handleOpenBatchReturnDialog(loan);
                            }}
                          >
                            <LibraryBooksIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box
                    sx={{
                      py: 3,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <LibraryBooksIcon
                      sx={{
                        fontSize: 40,
                        color: "var(--secondary-dark)",
                        opacity: 0.6,
                      }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      No loans found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm
                        ? "Try different search terms"
                        : activeTab === 1
                        ? "No overdue books"
                        : "No active loans"}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Borrow Books Dialog */}
      <Dialog
        open={openBorrowDialog}
        onClose={handleCloseBorrowDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Borrow Books</Typography>
          {selectedMember && (
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Member: {selectedMember.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  cursor: "pointer",
                  borderColor: selectedMember ? "primary.main" : "divider",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: 1,
                  },
                }}
                onClick={handleOpenMemberSelectDialog}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 56,
                    }}
                  >
                    <PersonIcon
                      sx={{ mr: 2, color: "primary.main", fontSize: 28 }}
                    />
                    {selectedMember ? (
                      <Box>
                        <Typography variant="subtitle1" component="div">
                          {selectedMember.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedMember.email}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="subtitle1" color="text.secondary">
                        Select a member to borrow books
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  cursor: "pointer",
                  borderColor:
                    selectedBooks.length > 0 ? "primary.main" : "divider",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: 1,
                  },
                }}
                onClick={handleOpenBookSelectDialog}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 56,
                    }}
                  >
                    <BookIcon
                      sx={{ mr: 2, color: "primary.main", fontSize: 28 }}
                    />
                    {selectedBooks.length > 0 ? (
                      <Box>
                        <Typography variant="subtitle1" component="div">
                          {selectedBooks.length} book(s) selected
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Click to add more books
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="subtitle1" color="text.secondary">
                        Select books to borrow
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Checkout Date"
                type="date"
                value={checkoutDate}
                onChange={handleCheckoutDateChange}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  "& .MuiInputBase-root": {
                    minHeight: "56px",
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: checkoutDate, // Ensure due date is not before checkout date
                }}
                sx={{
                  "& .MuiInputBase-root": {
                    minHeight: "56px",
                  },
                }}
              />
            </Grid>

            {/* Selected Books Section */}
            {selectedBooks.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Selected Books ({selectedBooks.length})
                </Typography>
                <Box sx={{ mb: 3 }}>
                  {selectedBooks.map((book) => (
                    <Card key={book.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            mb: 2,
                          }}
                        >
                          <Box
                            sx={{ display: "flex", alignItems: "flex-start" }}
                          >
                            {getBookCoverDisplay(book)}
                            <Box>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: "medium" }}
                              >
                                {book.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                by {book.author}
                              </Typography>
                              {book.isbn && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  ISBN: {book.isbn}
                                </Typography>
                              )}
                              <Chip
                                size="small"
                                label={book.category || "Uncategorized"}
                                sx={{ mt: 0.5, mr: 1 }}
                              />
                            </Box>
                          </Box>
                          <Box>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveBook(book.id);
                              }}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>

                        {/* Available Copies for this book */}
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Available Copies:
                        </Typography>

                        {loadingCopies ? (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              p: 2,
                            }}
                          >
                            <CircularProgress size={24} />
                          </Box>
                        ) : availableCopiesByBook[book.id]?.copies?.length >
                          0 ? (
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell padding="checkbox">
                                    Select
                                  </TableCell>
                                  <TableCell>Barcode</TableCell>
                                  <TableCell>Location</TableCell>
                                  <TableCell>Shelf</TableCell>
                                  <TableCell>Condition</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {availableCopiesByBook[book.id]?.copies.map(
                                  (copy) => (
                                    <TableRow
                                      key={copy.id}
                                      onClick={() =>
                                        handleToggleCopySelection(copy.id)
                                      }
                                      sx={{
                                        cursor: "pointer",
                                        bgcolor: selectedBookCopies.includes(
                                          copy.id
                                        )
                                          ? "rgba(25, 118, 210, 0.08)"
                                          : "inherit",
                                        "&:hover": {
                                          bgcolor: selectedBookCopies.includes(
                                            copy.id
                                          )
                                            ? "rgba(25, 118, 210, 0.12)"
                                            : "rgba(0, 0, 0, 0.04)",
                                        },
                                      }}
                                    >
                                      <TableCell padding="checkbox">
                                        <Checkbox
                                          checked={selectedBookCopies.includes(
                                            copy.id
                                          )}
                                          onChange={() =>
                                            handleToggleCopySelection(copy.id)
                                          }
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        {copy.barcode || "N/A"}
                                      </TableCell>
                                      <TableCell>
                                        {copy.location_code || "N/A"}
                                      </TableCell>
                                      <TableCell>
                                        {copy.shelf_name
                                          ? `${copy.shelf_name}`
                                          : "Not on shelf"}
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          size="small"
                                          label={copy.condition || "Unknown"}
                                          color={
                                            copy.condition === "New"
                                              ? "success"
                                              : copy.condition === "Good"
                                              ? "info"
                                              : copy.condition === "Fair"
                                              ? "warning"
                                              : "error"
                                          }
                                          variant="outlined"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  )
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        ) : (
                          <Alert severity="info" sx={{ mb: 1 }}>
                            No available copies for this book
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Grid>
            )}

            {/* Selected Copies Summary */}
            {selectedBookCopies.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: "primary.light", color: "white" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {selectedBookCopies.length}{" "}
                    {selectedBookCopies.length === 1 ? "copy" : "copies"}{" "}
                    selected for borrowing
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBorrowDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleBorrowBooks}
            variant="contained"
            color="primary"
            startIcon={<LibraryBooksIcon />}
            disabled={!selectedMember || selectedBookCopies.length === 0}
          >
            Borrow{" "}
            {selectedBookCopies.length > 0
              ? `${selectedBookCopies.length} Copies`
              : "Books"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Member Selection Dialog */}
      <Dialog
        open={openMemberSelectDialog}
        onClose={handleCloseMemberSelectDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Select Member</Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Search Members"
            type="text"
            fullWidth
            variant="outlined"
            value={memberSearchTerm}
            onChange={handleMemberSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ maxHeight: "400px", overflow: "auto" }}>
            <List sx={{ padding: 0 }}>
              {filteredMembers.map((member) => (
                <ListItem
                  key={member.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 1,
                    p: 1,
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                  onClick={() => handleMemberSelect(member)}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: "primary.main",
                        mr: 2,
                        width: 45,
                        height: 45,
                      }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">{member.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Phone: {member.phone || "N/A"}
                      </Typography>
                    </Box>
                    <Chip
                      label={member.membership_type}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ ml: "auto" }}
                    />
                  </Box>
                </ListItem>
              ))}
              {filteredMembers.length === 0 && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <PersonIcon
                    sx={{ fontSize: 48, color: "text.secondary", opacity: 0.5 }}
                  />
                  <Typography variant="subtitle1" color="text.secondary">
                    No members found
                  </Typography>
                </Box>
              )}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMemberSelectDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Book Selection Dialog */}
      <Dialog
        open={openBookSelectDialog}
        onClose={handleCloseBookSelectDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Select Books</Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Search Available Books"
            type="text"
            fullWidth
            variant="outlined"
            value={bookSearchTerm}
            onChange={handleBookSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ maxHeight: "400px", overflow: "auto" }}>
            <Grid container spacing={2}>
              {filteredAvailableBooks.map((book) => (
                <Grid item xs={12} sm={6} key={book.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      borderColor: selectedBooks.some((b) => b.id === book.id)
                        ? "primary.main"
                        : "divider",
                      borderWidth: selectedBooks.some((b) => b.id === book.id)
                        ? 2
                        : 1,
                      "&:hover": {
                        boxShadow: 2,
                      },
                    }}
                    onClick={() => handleBookSelect(book)}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Box sx={{ display: "flex" }}>
                        <Box sx={{ mr: 2 }}>
                          {book.front_cover ? (
                            <Box
                              component="img"
                              src={book.front_cover}
                              alt={`Cover for ${book.title}`}
                              sx={{
                                width: 60,
                                height: 90,
                                objectFit: "cover",
                                borderRadius: 1,
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 60,
                                height: 90,
                                bgcolor: book.cover_color || "#6B4226",
                                borderRadius: 1,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                color: "#fff",
                                fontSize: "10px",
                                textAlign: "center",
                                lineHeight: 1,
                                p: 0.5,
                              }}
                            >
                              {book.title}
                            </Box>
                          )}
                        </Box>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "medium", mb: 0.5 }}
                          >
                            {book.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            by {book.author}
                          </Typography>
                          {book.isbn && (
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              ISBN: {book.isbn}
                            </Typography>
                          )}
                          <Chip
                            label={book.category || "Uncategorized"}
                            size="small"
                            sx={{ mt: 1, fontSize: "0.7rem" }}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {filteredAvailableBooks.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <BookIcon
                      sx={{
                        fontSize: 48,
                        color: "text.secondary",
                        opacity: 0.5,
                      }}
                    />
                    <Typography variant="subtitle1" color="text.secondary">
                      No available books found
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBookSelectDialog}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Return Books Dialog */}
      <Dialog
        open={openReturnDialog}
        onClose={handleCloseReturnDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Return Books</Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="dense"
                label="Search Loans"
                type="text"
                variant="outlined"
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Box sx={{ maxHeight: "400px", overflow: "auto", mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Select books to return:
                </Typography>
                {loans.length > 0 ? (
                  loans.map((loan) => (
                    <Card
                      key={loan.id}
                      sx={{
                        mb: 2,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: selectedLoans.some((l) => l.id === loan.id)
                          ? "primary.main"
                          : "divider",
                        borderWidth: selectedLoans.some((l) => l.id === loan.id)
                          ? 2
                          : 1,
                        transition: "all 0.2s",
                        "&:hover": {
                          boxShadow: 1,
                        },
                      }}
                      onClick={() => {
                        if (selectedLoans.some((l) => l.id === loan.id)) {
                          setSelectedLoans(
                            selectedLoans.filter((l) => l.id !== loan.id)
                          );
                        } else {
                          // Add the loan with default condition and note
                          setSelectedLoans([
                            ...selectedLoans, 
                            { 
                              ...loan, 
                              returnCondition: 'Good', 
                              note: '' 
                            }
                          ]);
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Box sx={{ mr: 2 }}>
                              {loan.book_cover ? (
                                <Box
                                  component="img"
                                  src={loan.book_cover}
                                  alt={`Cover for ${loan.book_title}`}
                                  sx={{
                                    width: 50,
                                    height: 75,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 50,
                                    height: 75,
                                    bgcolor: loan.book_color || "#6B4226",
                                    borderRadius: 1,
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    color: "#fff",
                                    fontSize: "9px",
                                    textAlign: "center",
                                    lineHeight: 1,
                                    p: 0.5,
                                  }}
                                >
                                  {loan.book_title}
                                </Box>
                              )}
                            </Box>
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: "bold" }}
                              >
                                {loan.book_title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Borrowed by: {loan.member_name}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  mt: 1,
                                }}
                              >
                                <CalendarIcon
                                  sx={{
                                    fontSize: 14,
                                    mr: 0.5,
                                    color: "text.secondary",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ mr: 1 }}
                                >
                                  Borrowed: {formatDate(loan.checkout_date)}
                                </Typography>
                                <CalendarIcon
                                  sx={{
                                    fontSize: 14,
                                    mr: 0.5,
                                    color: isLoanOverdue(loan)
                                      ? "error.main"
                                      : "text.secondary",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  color={
                                    isLoanOverdue(loan)
                                      ? "error.main"
                                      : "text.secondary"
                                  }
                                >
                                  Due: {formatDate(loan.due_date)}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          {isLoanOverdue(loan) ? (
                            <Chip
                              icon={<WarningIcon />}
                              label="Overdue"
                              color="error"
                              size="small"
                            />
                          ) : (
                            <Chip
                              label={loan.status}
                              color="primary"
                              size="small"
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 4,
                      bgcolor: "background.paper",
                      borderRadius: 1,
                    }}
                  >
                    <LibraryBooksIcon
                      sx={{
                        fontSize: 48,
                        color: "text.secondary",
                        opacity: 0.5,
                      }}
                    />
                    <Typography variant="subtitle1" color="text.secondary">
                      No active loans found
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            {selectedLoans.length > 0 && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}
                >
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <ReturnIcon sx={{ mr: 1, color: "primary.main" }} />
                    Ready to Return ({selectedLoans.length} book
                    {selectedLoans.length !== 1 ? "s" : ""})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Please specify the return condition and any notes for each book.
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  
                  {/* Detailed view for each selected book */}
                    {selectedLoans.map((loan) => (
                    <Box 
                        key={loan.id}
                      sx={{ 
                        mt: 2, 
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: isLoanOverdue(loan) ? 'error.light' : 'divider',
                        '&:hover': { boxShadow: 1 } 
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton 
                              size="small" 
                              onClick={() => setSelectedLoans(selectedLoans.filter(l => l.id !== loan.id))}
                              sx={{ mr: 1 }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                            <Box>
                              <Typography variant="subtitle2">{loan.book_title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Borrowed: {formatDate(loan.checkout_date)} | 
                                Due: {formatDate(loan.due_date)}
                                {isLoanOverdue(loan) && (
                                  <Typography 
                                    component="span" 
                                    variant="caption" 
                                    color="error" 
                                    sx={{ ml: 1 }}
                                  >
                                    (Overdue)
                                  </Typography>
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={3}>
                          <FormControl size="small" fullWidth>
                            <InputLabel id={`condition-label-${loan.id}`}>Condition</InputLabel>
                            <Select
                              labelId={`condition-label-${loan.id}`}
                              value={loan.returnCondition || 'Good'}
                              label="Condition"
                              onChange={(e) => handleLoanConditionChange(loan.id, e.target.value)}
                            >
                              <MenuItem value="Good">Good</MenuItem>
                              <MenuItem value="Damaged">Damaged</MenuItem>
                              <MenuItem value="Lost">Lost</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={3}>
                          <TextField 
                            size="small"
                            fullWidth
                            label="Notes"
                        variant="outlined"
                            value={loan.note || ''}
                            onChange={(e) => handleLoanNoteChange(loan.id, e.target.value)}
                            placeholder="Optional"
                      />
                        </Grid>
                      </Grid>
                  </Box>
                  ))}
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReturnDialog}>Cancel</Button>
          <Button
            onClick={handleReturnBooks}
            variant="contained"
            color="primary"
            startIcon={<ReturnIcon />}
            disabled={selectedLoans.length === 0}
          >
            Return Books
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={openReceiptDialog}
        onClose={handleCloseReceiptDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">Borrowing Receipt</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={handlePrintReceipt}
            >
              Print
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box ref={receiptRef} sx={{ p: 2 }}>
            <Box className="receipt">
              <Box className="receipt-header">
                <Typography className="library-name" variant="h6">
                  Hiraya Balanghay Library
                </Typography>
                <Typography className="receipt-title" variant="subtitle2">
                  Book Loan Receipt
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Box className="member-details">
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: "bold", mb: 1 }}
                    >
                      Member Information
                    </Typography>
                    <Box className="detail-row">
                      <Typography variant="body2">Name:</Typography>
                      <Typography variant="body2">
                        {receiptData?.member?.name}
                      </Typography>
                    </Box>
                    <Box className="detail-row">
                      <Typography variant="body2">ID:</Typography>
                      <Typography variant="body2">
                        {receiptData?.member?.id}
                      </Typography>
                    </Box>
                  </Box>

                  <Box className="loan-details" sx={{ mt: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: "bold", mb: 1 }}
                    >
                      Loan Information
                    </Typography>
                    <Box className="detail-row">
                      <Typography variant="body2">Transaction:</Typography>
                      <Typography variant="body2">
                        {receiptData?.transactionId?.split("-")[1]}
                      </Typography>
                    </Box>
                    <Box className="detail-row">
                      <Typography variant="body2">Checkout:</Typography>
                      <Typography variant="body2">
                        {formatDate(receiptData?.checkoutDate)}
                      </Typography>
                    </Box>
                    <Box className="detail-row">
                      <Typography variant="body2">Due Date:</Typography>
                      <Typography variant="body2" className="due-date">
                        {formatDate(receiptData?.dueDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box className="qr-section">
                      {qrCodeData && (
                        <Box sx={{ textAlign: "center" }}>
                        <Box
                          component="img"
                          src={qrCodeData}
                          alt="Loan QR Code"
                          sx={{
                              width: 200,
                              height: 200,
                              border: "2px solid #1976d2", // Blue border for emphasis
                            borderRadius: 1,
                              p: 2,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                              mx: "auto", // Center horizontally
                              mb: 1
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{ 
                              mt: 1, 
                              fontWeight: "medium",
                              color: "primary.main"
                            }}
                          >
                            Scan to Return Books
                          </Typography>
                   
                    </Box>
                      )}
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 1 }}
              >
                Borrowed Items ({receiptData?.books?.length || 0})
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        Title
                      </TableCell>
                      <TableCell padding="none">Author</TableCell>
                      <TableCell padding="none">Copy Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {receiptData?.books?.map((book, index) => (
                      <TableRow key={book.id}>
                        <TableCell padding="none" sx={{ pl: 1 }}>
                          {book.title}
                        </TableCell>
                        <TableCell padding="none">{book.author}</TableCell>
                        <TableCell padding="none">
                          {receiptData?.bookCopies &&
                          receiptData.bookCopies[index] ? (
                            <Box>
                              <Typography variant="caption" display="block">
                                Barcode:{" "}
                                {receiptData.bookCopies[index].barcode || "N/A"}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Location:{" "}
                                {receiptData.bookCopies[index].locationCode ||
                                  "N/A"}
                              </Typography>
                            </Box>
                          ) : (
                            "No copy details"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box className="footer">
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Thank you for using Hiraya Balanghay Library!
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                  Please keep this receipt and return by:{" "}
                  {formatDate(receiptData?.dueDate)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReceiptDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Scanner Dialog */}
      <Dialog
        open={openQRScannerDialog}
        onClose={handleCloseQRScannerDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Return Books</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            {/* Direct Loan ID input section - more prominent */}
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                mb: 3,
                bgcolor: "#f8f9fa",
                border: "1px solid #e0e0e0",
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Quick Return by Loan ID
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the loan ID number to quickly return books without
                scanning:
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    size="medium"
                    variant="outlined"
                    label="Loan ID"
                    placeholder="Enter loan ID number"
                    value={directLoanId}
                    onChange={(e) => setDirectLoanId(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ReturnIcon />
                        </InputAdornment>
                      ),
                    }}
                    helperText="You can find the loan ID in active loans table"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleDirectLoanReturn}
                    disabled={
                      !directLoanId.trim() || !/^\d+$/.test(directLoanId.trim())
                    }
                    sx={{ height: "56px" }}
                  >
                    Return Book
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Divider sx={{ my: 3, borderStyle: "dashed" }}>
              <Chip label="OR" />
            </Divider>

            <Typography
              variant="subtitle1"
              fontWeight="bold"
              gutterBottom
              align="center"
            >
              Return Books by QR Code
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
                    disabled={qrScannerActive}
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
                  disabled={qrScannerActive}
                >
                  Refresh Cameras
                </Button>
              </Grid>
            </Grid>

            {/* Camera view or instruction */}
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

            {!qrScannerActive && !scannerResult && (
              <Box sx={{ mb: 2, textAlign: "center" }}>
                <QrCodeScannerIcon
                  sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
                />
                <Typography variant="body1">
                  Scan a QR code from a loan receipt to quickly return books.
                </Typography>
                {cameras.length === 0 ? (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    No cameras detected. Please allow camera access or use manual entry.
                  </Typography>
                ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={startQRScanner}
                  sx={{ mt: 2 }}
                >
                  Start Scanning
                </Button>
                )}
              </Box>
            )}

            {/* Result message */}
            {scannerResult && (
              <Box sx={{ mb: 2, mt: 2, textAlign: "center" }}>
                <Typography
                  variant="subtitle1"
                  color={
                    scannerResult.includes("Error")
                      ? "error"
                      : scannerResult.includes("Processing")
                      ? "primary.main"
                      : scannerResult.includes("Camera") ||
                        scannerResult.includes("Scanning")
                      ? "text.secondary"
                      : "success.main"
                  }
                  sx={{ fontWeight: "medium", mb: 1 }}
                >
                  {scannerResult}
                </Typography>
              </Box>
            )}

            {/* Manual QR code entry form */}
            <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Manual QR Code Entry
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 2 }}
              >
                If scanning doesn't work, you can paste the entire QR code data
                here:
              </Typography>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                label="Enter QR code data"
                placeholder="Paste the QR code content here"
                value={manualQRInput}
                onChange={(e) => setManualQRInput(e.target.value)}
                multiline
                rows={3}
                sx={{ mb: 1 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleManualQRSubmit}
                disabled={manualQRInput.trim() === ""}
              >
                Process QR Data
              </Button>
            </Paper>

            {/* Debug actions */}
            {qrScannerActive && (
              <Box sx={{ mt: 2, textAlign: "center" }}>
                {torchAvailable && (
                <Button
                  variant="outlined"
                    color="secondary"
                    onClick={toggleTorch}
                  size="small"
                    startIcon={torchActive ? <FlashOffIcon /> : <FlashOnIcon />}
                  sx={{ mr: 1 }}
                >
                    {torchActive ? "Turn Flashlight Off" : "Turn Flashlight On"}
                </Button>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  onClick={stopQRScanner}
                  size="small"
                >
                  Stop Scanner
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQRScannerDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Debug Image Dialog */}
      <Dialog
        open={showDebugImage}
        onClose={() => setShowDebugImage(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Camera Snapshot</DialogTitle>
        <DialogContent>
          {debugImage && (
            <Box sx={{ textAlign: "center" }}>
              <img
                src={debugImage}
                alt="Camera snapshot"
                style={{ maxWidth: "100%", maxHeight: "70vh" }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                If your QR code is visible but not scanning, try different
                lighting or holding the device more steadily.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDebugImage(false)}>Close</Button>
          {debugImage && (
            <Button
              component="a"
              href={debugImage}
              download="qr-scan-debug.png"
              variant="contained"
            >
              Download Image
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Clear Loans Confirmation Dialog */}
      <Dialog
        open={openClearLoansDialog}
        onClose={handleCloseClearLoansDialog}
        aria-labelledby="clear-loans-dialog-title"
      >
        <DialogTitle id="clear-loans-dialog-title">Clear All Loans</DialogTitle>
        <DialogContent>
          <Typography>
            This will delete ALL loans from the database and reset all checked
            out book copies to "Available" status. This action cannot be undone.
          </Typography>
          <Typography sx={{ mt: 2, fontWeight: "bold", color: "error.main" }}>
            Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClearLoansDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleClearAllLoans}
            color="error"
            variant="contained"
            disabled={isClearingLoans}
            startIcon={
              isClearingLoans ? <CircularProgress size={20} /> : <CloseIcon />
            }
          >
            {isClearingLoans ? "Clearing..." : "Clear All Loans"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Popover */}
      <Popover
        open={Boolean(qrPopoverAnchor)}
        anchorEl={qrPopoverAnchor}
        onClose={handleCloseQRPopover}
        anchorOrigin={{
          vertical: "center",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "center",
          horizontal: "left",
        }}
      >
        <Box sx={{ p: 2, textAlign: "center" }}>
          {currentLoanQR && (
            <>
              <Box
                component="img"
                src={currentLoanQR}
                alt="Loan QR Code"
                sx={{ width: 150, height: 150 }}
              />
              <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                Scan to return this book
              </Typography>
            </>
          )}
        </Box>
      </Popover>

      {/* Debug info before rendering MultiBookReturn */}
      {console.log('About to render MultiBookReturn with props:', {
        open: multiReturnDialogOpen,
        memberId: selectedMemberForReturn?.id,
        memberName: selectedMemberForReturn?.name,
        selectedMemberExists: !!selectedMemberForReturn
      })}

      {/* Add multi-book return dialog */}
      <MultiBookReturn
        open={multiReturnDialogOpen}
        onClose={handleCloseMultiReturnDialog}
        memberId={selectedMemberForReturn ? Number(selectedMemberForReturn.id) : undefined}
        onSuccess={handleMultiReturnSuccess}
        currentUser={selectedMemberForReturn}
      />

      {/* Batch Return Dialog */}
      <Dialog
        open={batchReturnDialogOpen}
        onClose={() => setBatchReturnDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Select Books to Return</Typography>
        </DialogTitle>
        <DialogContent>
          {loadingBatchLoans ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                  Please select the books you want to return from this batch:
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Only books that have not been returned are shown below.
                </Typography>
              </Box>
              
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: 'primary.light' }}>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={
                            selectedBatchItems.length > 0 && 
                            selectedBatchItems.length < batchLoansToReturn.length
                          }
                          checked={
                            batchLoansToReturn.length > 0 && 
                            selectedBatchItems.length === batchLoansToReturn.length
                          }
                          onChange={e => {
                            if (e.target.checked) {
                              // Select all
                              setSelectedBatchItems(
                                batchLoansToReturn.map(item => item.individualId || item.loanId)
                              );
                            } else {
                              // Deselect all
                              setSelectedBatchItems([]);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>Book</TableCell>
                      <TableCell>Details</TableCell>
                      <TableCell>Loan ID</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batchLoansToReturn.map((item) => {
                      // Use individual ID if available, otherwise use loan ID
                      const itemId = item.individualId || item.loanId;
                      const isSelected = selectedBatchItems.includes(itemId);
                      
                      return (
                        <TableRow 
                          key={`${item.loanId}-${item.title}-${itemId}`}
                          hover
                          onClick={() => toggleBatchItemSelection(itemId)}
                          selected={isSelected}
                          sx={{ 
                            cursor: 'pointer',
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(25, 118, 210, 0.08)',
                            }
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox 
                              checked={isSelected}
                              onClick={e => {
                                e.stopPropagation();
                                toggleBatchItemSelection(itemId);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {item.cover ? (
                                <Box
                                  component="img"
                                  src={item.cover}
                                  alt={`Cover for ${item.title}`}
                                  sx={{
                                    width: 40,
                                    height: 60,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                    mr: 2,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 40,
                                    height: 60,
                                    bgcolor: item.coverColor || "#6B4226",
                                    borderRadius: 1,
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    color: "#fff",
                                    fontSize: "8px",
                                    textAlign: "center",
                                    lineHeight: 1,
                                    p: 0.5,
                                    mr: 2,
                                  }}
                                >
                                  {item.title}
                                </Box>
                              )}
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                  {item.title}
                                </Typography>
                                {item.author && (
                                  <Typography variant="body2" color="text.secondary">
                                    by {item.author}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              Barcode: {item.barcode || 'N/A'}
                            </Typography>
                            {item.bookCopyId && (
                              <Typography variant="body2" color="text.secondary">
                                Copy ID: {item.bookCopyId}
                              </Typography>
                            )}
                            {item.isbn && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                ISBN: {item.isbn}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.individualId ? (
                              <Chip 
                                label={`ID: ${item.individualId}`} 
                                color="primary" 
                                variant="outlined" 
                                size="small" 
                              />
                            ) : (
                              <Chip 
                                label={`Batch: ${item.loanId}`} 
                                color="secondary" 
                                variant="outlined" 
                                size="small" 
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.status || "Checked Out"}
                              color={
                                item.status === "Overdue" 
                                  ? "error" 
                                  : item.status === "Returned" 
                                    ? "success" 
                                    : "primary"
                              }
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {batchLoansToReturn.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                          <Typography color="text.secondary">
                            No books found in this batch loan
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="info.contrastText">
                  <strong>Selected:</strong> {selectedBatchItems.length} of {batchLoansToReturn.length} books
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setBatchReturnDialogOpen(false)} 
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBatchReturn}
            variant="contained"
            color="primary"
            startIcon={<AssignmentReturnedIcon />}
            disabled={selectedBatchItems.length === 0 || loadingBatchLoans}
          >
            Return Selected Books
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoanManagement;
