import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Button,
  Snackbar,
  IconButton
} from '@mui/material';
import {
  Book,
  People,
  MenuBook,
  Assignment,
  Category,
  CalendarMonth,
  TrendingUp,
  BarChart as BarChartIcon,
  PictureAsPdf,
  Close
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

/**
 * Reports component that provides various statistical reports about the library
 */
const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [pdfEndpointsAvailable, setPdfEndpointsAvailable] = useState(false);

  // Get theme for responsive design
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isExtraSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Data states
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [monthlyCheckouts, setMonthlyCheckouts] = useState([]);

  // Derived statistics
  const [bookStats, setBookStats] = useState({
    total: 0,
    available: 0,
    checkedOut: 0,
    categories: []
  });
  const [memberStats, setMemberStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });
  const [loanStats, setLoanStats] = useState({
    total: 0,
    active: 0,
    overdue: 0,
    returned: 0,
    monthlyAverage: 0
  });

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // PDF Generation handlers
  const handleGeneratePDF = async (reportType) => {
    try {
      setLoading(true);
      
      let endpoint = '';
      let reportTitle = '';
      
      switch (reportType) {
        case 'dashboard':
          endpoint = 'dashboard/pdf';
          reportTitle = 'Dashboard';
          break;
        case 'books':
          endpoint = 'books/pdf';
          reportTitle = 'Books Inventory';
          break;
        case 'members':
          endpoint = 'members/pdf';
          reportTitle = 'Members';
          break;
        case 'loans':
          endpoint = 'loans/pdf';
          reportTitle = 'Circulation';
          break;
        case 'overdue':
          endpoint = 'overdue/pdf';
          reportTitle = 'Overdue Items';
          break;
        default:
          throw new Error('Invalid report type');
      }
      
      // Get the server settings
      let apiAddress = 'http://localhost:3001'; // Default fallback
      
      try {
        // Try to get settings from the API if available
        if (window.api && window.api.settings && typeof window.api.settings.get === 'function') {
          const settingsResult = await window.api.settings.get();
          if (settingsResult.success && settingsResult.settings && settingsResult.settings.apiAddress) {
            apiAddress = settingsResult.settings.apiAddress;
          }
        }
      } catch (settingsError) {
        console.warn("Could not retrieve API address from settings:", settingsError);
      }
      
      // Use the API endpoint to download the PDF
      try {
        const fullUrl = `${apiAddress}/api/reports/${endpoint}`;
        console.log(`Fetching PDF from: ${fullUrl}`);
        
        const response = await fetch(fullUrl);
        
        if (!response.ok) {
          if (response.status === 404) {
            setSnackbar({
              open: true,
              message: `PDF generation is not available. The PDF endpoints are not configured on the server.`,
              severity: 'warning'
            });
            
            // Mark PDF endpoints as unavailable
            setPdfEndpointsAvailable(false);
          } else {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
          }
          return;
        }
        
        // If we got here, endpoints are available
        setPdfEndpointsAvailable(true);
        
        // Create a blob from the PDF stream
        const blob = await response.blob();
        
        // Check if the blob is actually a PDF
        if (blob.type !== 'application/pdf') {
          throw new Error('Server did not return a valid PDF file');
        }
        
        // Create a link element and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${reportTitle}_Report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        setSnackbar({
          open: true,
          message: `${reportTitle} report downloaded successfully`,
          severity: 'success'
        });
      } catch (error) {
        console.error(`Error generating ${reportType} PDF:`, error);
        setSnackbar({
          open: true,
          message: `Error generating PDF: ${error.message}. PDF generation may not be available in this environment.`,
          severity: 'error'
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error in PDF generation:', err);
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Check if PDF endpoints are available
        try {
          let apiAddress = 'http://localhost:3001'; // Default fallback
          
          if (window.api && window.api.settings && typeof window.api.settings.get === 'function') {
            const settingsResult = await window.api.settings.get();
            if (settingsResult.success && settingsResult.settings && settingsResult.settings.apiAddress) {
              apiAddress = settingsResult.settings.apiAddress;
            }
          }
          
          // Try to ping one of the endpoints to see if it exists
          const testUrl = `${apiAddress}/api/reports/dashboard/pdf`;
          const testResponse = await fetch(testUrl, { method: 'HEAD' });
          
          setPdfEndpointsAvailable(!testResponse.status || testResponse.status !== 404);
          console.log(`PDF endpoints availability check: ${!testResponse.status || testResponse.status !== 404}`);
        } catch (endpointError) {
          console.warn("Could not check PDF endpoints availability:", endpointError);
          setPdfEndpointsAvailable(false);
        }

        // Fetch books
        try {
          const booksResult = await window.api.books.getAll();
          
          // Check if we got an array directly (legacy API) or success/data structure
          const bookData = Array.isArray(booksResult) ? booksResult : 
                        (booksResult && booksResult.success && booksResult.data) ? booksResult.data : [];
          
          // Log the processed data
          console.log("Books data processed:", { 
            type: typeof bookData, 
            isArray: Array.isArray(bookData), 
            length: bookData.length 
          });
          
          setBooks(bookData);
          
          // Calculate book statistics
          const availableBooks = bookData.filter(book => book.status === 'Available').length;
          const checkedOutBooks = bookData.filter(book => book.status === 'Checked Out').length;
          
          // Extract categories
          const categories = {};
          bookData.forEach(book => {
            const category = book.category || 'Uncategorized';
            if (categories[category]) {
              categories[category]++;
            } else {
              categories[category] = 1;
            }
          });
          
          // Format categories for charts
          const categoryData = Object.keys(categories).map(category => ({
            name: category,
            value: categories[category]
          }));
          
          setBookStats({
            total: bookData.length,
            available: availableBooks,
            checkedOut: checkedOutBooks,
            categories: categoryData
          });
        } catch (bookError) {
          console.error("Failed to fetch books:", bookError);
          setBooks([]);
        }

        // Fetch members
        try {
          const membersResult = await window.api.members.getAll();
          
          // Check if we got an array directly (legacy API) or success/data structure
          const memberData = Array.isArray(membersResult) ? membersResult : 
                          (membersResult && membersResult.success && membersResult.data) ? membersResult.data : [];
          
          console.log("Members data processed:", { 
            type: typeof memberData, 
            isArray: Array.isArray(memberData), 
            length: memberData.length 
          });
          
          setMembers(memberData);
          
          // Calculate member statistics
          const activeMembers = memberData.filter(member => member.status === 'Active').length;
          const inactiveMembers = memberData.filter(member => member.status !== 'Active').length;
          
          setMemberStats({
            total: memberData.length,
            active: activeMembers,
            inactive: inactiveMembers
          });
        } catch (memberError) {
          console.error("Failed to fetch members:", memberError);
          setMembers([]);
        }

        // Fetch loans
        try {
          const loansResult = await window.api.loans.getAll();
          
          // Check if we got an array directly (legacy API) or success/data structure
          const loanData = Array.isArray(loansResult) ? loansResult : 
                        (loansResult && loansResult.success && loansResult.data) ? loansResult.data : [];
          
          console.log("Loans data processed:", { 
            type: typeof loanData, 
            isArray: Array.isArray(loanData), 
            length: loanData.length 
          });
          
          setLoans(loanData);
          
          // Calculate loan statistics
          const activeLoans = loanData.filter(loan => loan.status === 'Active' || loan.status === 'Borrowed').length;
          const returnedLoans = loanData.filter(loan => loan.status === 'Returned').length;
          
          setLoanStats(prev => ({
            ...prev,
            total: loanData.length,
            active: activeLoans,
            returned: returnedLoans
          }));
        } catch (loanError) {
          console.error("Failed to fetch loans:", loanError);
          setLoans([]);
        }

        // Fetch overdue loans
        try {
          const overdueResult = await window.api.loans.getOverdue();
          
          // Check if we got an array directly (legacy API) or success/data structure
          const overdueData = Array.isArray(overdueResult) ? overdueResult : 
                            (overdueResult && overdueResult.success && overdueResult.data) ? overdueResult.data : [];
          
          console.log("Overdue loans processed:", { 
            type: typeof overdueData, 
            isArray: Array.isArray(overdueData), 
            length: overdueData.length 
          });
          
          setOverdueLoans(overdueData);
          
          setLoanStats(prev => ({
            ...prev,
            overdue: overdueData.length
          }));
        } catch (overdueError) {
          console.error("Failed to fetch overdue loans:", overdueError);
          setOverdueLoans([]);
        }

        // Fetch popular books
        try {
          const popularBooksResult = await window.api.dashboard.getPopularBooks(8);
          
          // Check if we got an array directly (legacy API) or success/data structure
          const popularBooksData = Array.isArray(popularBooksResult) ? popularBooksResult : 
                                (popularBooksResult && popularBooksResult.success && popularBooksResult.data) ? popularBooksResult.data : [];
          
          console.log("Popular books processed:", { 
            type: typeof popularBooksData, 
            isArray: Array.isArray(popularBooksData), 
            length: popularBooksData.length 
          });
          
          setPopularBooks(popularBooksData);
        } catch (popularBooksError) {
          console.error("Failed to fetch popular books:", popularBooksError);
          setPopularBooks([]);
        }

        // Fetch popular categories
        try {
          const categoriesResult = await window.api.dashboard.getPopularCategories(8);
          
          // Check if we got an array directly (legacy API) or success/data structure
          const categoriesData = Array.isArray(categoriesResult) ? categoriesResult : 
                              (categoriesResult && categoriesResult.success && categoriesResult.data) ? categoriesResult.data : [];
          
          console.log("Popular categories processed:", { 
            type: typeof categoriesData, 
            isArray: Array.isArray(categoriesData), 
            length: categoriesData.length 
          });
          
          setPopularCategories(categoriesData);
        } catch (categoriesError) {
          console.error("Failed to fetch popular categories:", categoriesError);
          setPopularCategories([]);
        }

        // Fetch monthly checkouts (with fallback mechanisms)
        try {
          // Try the standardized API method first
          let monthlyData = [];
          let apiFound = false;
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

          if (typeof window.api.dashboard?.getMonthlyCheckouts === 'function') {
            try {
              const monthlyResult = await window.api.dashboard.getMonthlyCheckouts();
              
              // Check if we got an array directly (legacy API) or success/data structure 
              if (Array.isArray(monthlyResult)) {
                monthlyData = monthlyResult;
                apiFound = true;
                console.log("Successfully fetched monthly checkouts via dashboard API (array response)");
              } else if (monthlyResult && monthlyResult.success && Array.isArray(monthlyResult.data)) {
                monthlyData = monthlyResult.data;
                apiFound = true;
                console.log("Successfully fetched monthly checkouts via dashboard API");
              }
              
              console.log("Monthly data processed:", { 
                type: typeof monthlyData, 
                isArray: Array.isArray(monthlyData), 
                length: monthlyData.length 
              });
            } catch (apiError) {
              console.warn("Error using dashboard.getMonthlyCheckouts():", apiError);
            }
          }

          // Try backup IPC method
          if (!apiFound && typeof window.api.getMonthlyCheckouts === 'function') {
            try {
              const result = await window.api.getMonthlyCheckouts();
              if (Array.isArray(result)) {
                monthlyData = result;
                apiFound = true;
                console.log("Successfully fetched monthly checkouts via IPC (array response)");
              } else if (result && result.success && Array.isArray(result.data)) {
                monthlyData = result.data;
                apiFound = true;
                console.log("Successfully fetched monthly checkouts via IPC");
              }
            } catch (ipcError) {
              console.warn("Error with IPC getMonthlyCheckouts:", ipcError);
            }
          }

          // Try to manually calculate monthly data if we have loans data
          if (!apiFound && loans.length > 0) {
            try {
              console.log("Calculating monthly checkouts from loan data");
              
              // Group loans by month using SQLite-compatible extraction
              const loansByMonth = {};
              const currentYear = new Date().getFullYear();
              
              // Initialize all months with 0 count
              months.forEach((month, index) => {
                loansByMonth[index + 1] = 0;
              });
              
              // Count checkouts for each month
              loans.forEach(loan => {
                if (loan.checkout_date) {
                  const checkoutDate = new Date(loan.checkout_date);
                  
                  // Only count loans from current year
                  if (checkoutDate.getFullYear() === currentYear) {
                    const month = checkoutDate.getMonth() + 1; // 1-12
                    loansByMonth[month] = (loansByMonth[month] || 0) + 1;
                  }
                }
              });
              
              // Convert to the format needed for the chart
              monthlyData = months.map((monthName, index) => ({
                month: monthName,
                count: loansByMonth[index + 1] || 0
              }));
              
              apiFound = true;
            } catch (calcError) {
              console.warn("Error calculating monthly data:", calcError);
            }
          }

          // If all approaches failed, use empty data
          if (!apiFound) {
            console.warn("No working method for monthly checkouts, using empty data");
            monthlyData = months.map(month => ({ month, count: 0 }));
          }

          setMonthlyCheckouts(monthlyData);
          
          // Calculate monthly average if we have data
          if (monthlyData.length > 0) {
            const totalCheckouts = monthlyData.reduce((sum, month) => sum + (month.count || 0), 0);
            const activeMonths = monthlyData.filter(month => (month.count || 0) > 0).length || 1;
            const monthlyAverage = Math.round(totalCheckouts / activeMonths);
            
            setLoanStats(prev => ({
              ...prev,
              monthlyAverage
            }));
          }
        } catch (monthlyError) {
          console.error("All monthly checkout fetch methods failed:", monthlyError);
          // Set empty data for months
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          setMonthlyCheckouts(months.map(month => ({ month, count: 0 })));
        }

        setLoading(false);
      } catch (err) {
        console.error("Error in main fetchAllData function:", err);
        setError(err.message || "Failed to load report data");
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Define chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  // Component for statistic cards with improved responsiveness
  const StatCard = ({ icon, title, value, total, color }) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
      <Card elevation={3} sx={{ 
        height: '100%', 
        width: '100%', // Ensure full width within the grid item
        borderLeft: `4px solid ${color}`,
        transition: 'transform 0.3s ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 6
        }
      }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                backgroundColor: `${color}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                width: { xs: 35, sm: 40 },
                height: { xs: 35, sm: 40 },
                mr: 2
              }}
            >
              {React.cloneElement(icon, { sx: { color: color } })}
            </Box>
            <Typography variant="h6" component="div" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {title}
            </Typography>
          </Box>
          
          <Typography variant="h3" component="div" sx={{ 
            fontWeight: 'bold', 
            mb: 1, 
            fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' } 
          }}>
            {loading ? <CircularProgress size={24} /> : value}
          </Typography>
          
          {total > 0 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: 2 }}>
                <Box sx={{ flexGrow: 1, mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={percentage} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: `${color}20`,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: color,
                      }
                    }} 
                  />
                </Box>
                <Typography variant="body2" component="div" sx={{ minWidth: 40 }}>
                  {percentage}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {value} out of {total} total
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Books Report Component with improved responsiveness
  const BooksReport = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ 
          mb: 0, 
          fontSize: { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' }
        }}>
          Books Inventory Report
        </Typography>
        
        {pdfEndpointsAvailable && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdf />}
            onClick={() => handleGeneratePDF('books')}
            sx={{ 
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              py: { xs: 1, sm: 1.5 },
              px: { xs: 2, sm: 3 }
            }}
          >
            Generate PDF
          </Button>
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<Book />}
            title="Total Books"
            value={bookStats.total}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<MenuBook />}
            title="Available Books"
            value={bookStats.available}
            total={bookStats.total}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<Assignment />}
            title="Checked Out Books"
            value={bookStats.checkedOut}
            total={bookStats.total}
            color="#ff9800"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ 
            p: { xs: 2, sm: 3 }, 
            height: '100%', 
            width: '100%', // Ensure full width
            minHeight: { xs: 300, sm: 400 }, 
            borderRadius: 2,
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: 6
            }
          }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Books by Category
      </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ height: { xs: 250, sm: 350 }, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bookStats.categories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={isSmallScreen ? 80 : 120}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => 
                        isExtraSmallScreen 
                          ? `${(percent * 100).toFixed(0)}%` 
                          : `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {bookStats.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} books`, 'Count']} />
                    {!isExtraSmallScreen && <Legend />}
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ 
            p: { xs: 2, sm: 3 }, 
            height: '100%', 
            width: '100%', // Ensure full width
            minHeight: { xs: 300, sm: 400 },
            borderRadius: 2,
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: 6
            } 
          }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Most Popular Books
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ height: { xs: 250, sm: 350 }, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={popularBooks.slice(0, isSmallScreen ? 4 : 6).map(book => ({
                      name: book.title.length > (isSmallScreen ? 15 : 20) ? 
                        book.title.substring(0, isSmallScreen ? 15 : 20) + '...' : 
                        book.title,
                      checkouts: book.checkout_count || 0
                    }))}
                    layout="vertical"
                  margin={{
                    top: 5,
                      right: isSmallScreen ? 5 : 30, 
                      left: isSmallScreen ? 0 : 20, 
                      bottom: 5 
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: isSmallScreen ? 10 : 12 }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={isSmallScreen ? 100 : 150} 
                      tick={{ fontSize: isSmallScreen ? 10 : 12 }}
                    />
                    <Tooltip formatter={(value) => [`${value} checkouts`, 'Checkouts']} />
                    <Legend wrapperStyle={{ fontSize: isSmallScreen ? 10 : 12 }} />
                    <Bar dataKey="checkouts" fill="#8884d8" name="Checkouts" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  // Members Report Component with improved responsiveness
  const MembersReport = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ 
          mb: 0, 
          fontSize: { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' }
        }}>
          Members Report
        </Typography>
        
        {pdfEndpointsAvailable && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdf />}
            onClick={() => handleGeneratePDF('members')}
            sx={{ 
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              py: { xs: 1, sm: 1.5 },
              px: { xs: 2, sm: 3 }
            }}
          >
            Generate PDF
          </Button>
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<People />}
            title="Total Members"
            value={memberStats.total}
            color="#9c27b0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<People />}
            title="Active Members"
            value={memberStats.active}
            total={memberStats.total}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<People />}
            title="Inactive Members"
            value={memberStats.inactive}
            total={memberStats.total}
            color="#f44336"
          />
        </Grid>
      </Grid>

      <Paper elevation={3} sx={{ 
        p: { xs: 2, sm: 3 }, 
        mb: 3,
        width: '100%', // Ensure full width
        borderRadius: 2,
        transition: 'transform 0.3s ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 6
        }
      }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
          Recent Member Activity
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ overflow: 'auto' }}>
            <Table size={isSmallScreen ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  <TableCell>Member Name</TableCell>
                  {!isExtraSmallScreen && <TableCell>Email</TableCell>}
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell align="center">Current</TableCell>
                  <TableCell align="center">Overdue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.slice(0, isSmallScreen ? 5 : 10).map((member) => {
                  // Calculate member activity
                  const memberLoans = loans.filter(loan => loan.member_id === member.id);
                  const activeLoans = memberLoans.filter(loan => loan.status === 'Active' || loan.status === 'Borrowed');
                  const overdueItems = overdueLoans.filter(loan => loan.member_id === member.id);
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}</TableCell>
                      {!isExtraSmallScreen && <TableCell>{member.email || 'N/A'}</TableCell>}
                      <TableCell>
                        <Box sx={{ 
                          bgcolor: member.status === 'Active' ? 'success.main' : 'error.main',
                          color: 'white',
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          display: 'inline-block',
                          fontSize: { xs: '0.7rem', sm: '0.8rem' }
                        }}>
                          {member.status || 'Unknown'}
                        </Box>
                      </TableCell>
                      <TableCell align="center">{memberLoans.length}</TableCell>
                      <TableCell align="center">{activeLoans.length}</TableCell>
                      <TableCell align="center">{overdueItems.length}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );

  // Circulation Report Component with improved responsiveness
  const CirculationReport = () => (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ 
          mb: 0, 
          fontSize: { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' }
        }}>
          Circulation Report
        </Typography>
        
        {pdfEndpointsAvailable && (
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PictureAsPdf />}
              onClick={() => handleGeneratePDF('loans')}
              sx={{ 
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                py: { xs: 1, sm: 1.5 },
                px: { xs: 2, sm: 3 },
                mr: 1
              }}
            >
              Loans PDF
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PictureAsPdf />}
              onClick={() => handleGeneratePDF('overdue')}
              sx={{ 
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                py: { xs: 1, sm: 1.5 },
                px: { xs: 2, sm: 3 }
              }}
            >
              Overdue PDF
            </Button>
          </Box>
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            icon={<Assignment />}
            title="Total Loans"
            value={loanStats.total}
            color="#673ab7"
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            icon={<MenuBook />}
            title="Active Loans"
            value={loanStats.active}
            total={loanStats.total}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            icon={<TrendingUp />}
            title="Monthly Average"
            value={loanStats.monthlyAverage}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            icon={<Assignment />}
            title="Overdue Items"
            value={loanStats.overdue}
            total={loanStats.active}
            color="#f44336"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ width: '100%' }}>
        <Grid item xs={12} lg={8}>
          <Paper elevation={3} sx={{ 
            p: { xs: 2, sm: 3 }, 
            height: '100%',
            width: '100%', 
            minHeight: { xs: 300, sm: 400 },
            borderRadius: 2,
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: 6
            },
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Monthly Checkouts
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ height: { xs: 250, sm: 350 }, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyCheckouts}
                  margin={{
                    top: 5,
                      right: isSmallScreen ? 5 : 30, 
                      left: isSmallScreen ? 0 : 20, 
                      bottom: 5 
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: isSmallScreen ? 10 : 12 }}
                      interval={isSmallScreen ? 1 : 0}
                    />
                    <YAxis tick={{ fontSize: isSmallScreen ? 10 : 12 }} />
                  <Tooltip />
                    <Legend wrapperStyle={{ fontSize: isSmallScreen ? 10 : 12 }} />
                    <Line
                      type="monotone"
                    dataKey="count"
                      stroke="#8884d8"
                      name="Book Checkouts"
                      strokeWidth={2}
                      dot={{ r: isSmallScreen ? 3 : 5 }}
                      activeDot={{ r: isSmallScreen ? 5 : 8 }}
                    />
                  </LineChart>
              </ResponsiveContainer>
            </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper elevation={3} sx={{ 
            p: { xs: 2, sm: 3 }, 
            height: '100%',
            width: '100%',
            minHeight: { xs: 300, sm: 400 },
            borderRadius: 2,
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: 6
            }
          }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Overdue Items
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ height: { xs: 250, sm: 350 }, overflow: 'auto' }}>
                {overdueLoans.length === 0 ? (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    No overdue items!
                  </Alert>
                ) : (
                  <Table size={isSmallScreen ? "small" : "medium"}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Book Title</TableCell>
                        {!isExtraSmallScreen && <TableCell>Member</TableCell>}
                        <TableCell>Due Date</TableCell>
                        <TableCell align="center">Days</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overdueLoans.slice(0, isSmallScreen ? 5 : 10).map((loan) => {
                        // Calculate days overdue
                        const dueDate = new Date(loan.due_date);
                        const today = new Date();
                        const diffTime = Math.abs(today - dueDate);
                        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        return (
                          <TableRow key={loan.id}>
                            <TableCell sx={{ 
                              maxWidth: { xs: '100px', sm: '150px' }, 
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {loan.book_title || 'Unknown'}
                            </TableCell>
                            {!isExtraSmallScreen && <TableCell>{loan.member_name || 'Unknown'}</TableCell>}
                            <TableCell>{new Date(loan.due_date).toLocaleDateString()}</TableCell>
                            <TableCell align="center">
                              <Box sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                {daysOverdue}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  // Loading indicator
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading report data: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3 }, pb: 4, maxWidth: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        borderBottom: '2px solid var(--primary)',
        pb: 1
      }}>
        <Typography variant="h4" gutterBottom sx={{ 
          fontWeight: 'bold', 
          color: 'var(--secondary-dark)', 
          mb: 0,
          fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' }
        }}>
          Library Reports and Analytics
        </Typography>
        
        {pdfEndpointsAvailable && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdf />}
            onClick={() => handleGeneratePDF('dashboard')}
            sx={{ 
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              py: { xs: 1, sm: 1.5 },
              px: { xs: 2, sm: 3 }
            }}
          >
            Dashboard PDF
          </Button>
        )}
      </Box>
      
      <Paper elevation={3} sx={{ mb: 3, borderRadius: 2, width: '100%' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            width: '100%',
            '& .MuiTab-root': {
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              p: { xs: 1, sm: 2 },
              minHeight: { xs: 40, sm: 48 }
            }
          }}
        >
          <Tab 
            icon={<Book sx={{ mr: 1, fontSize: { xs: 18, sm: 24 } }} />} 
            label="Books Report"
            iconPosition="start"
          />
          <Tab 
            icon={<People sx={{ mr: 1, fontSize: { xs: 18, sm: 24 } }} />} 
            label="Members Report"
            iconPosition="start"
          />
          <Tab 
            icon={<BarChartIcon sx={{ mr: 1, fontSize: { xs: 18, sm: 24 } }} />} 
            label="Circulation Report"
            iconPosition="start"
          />
        </Tabs>
      </Paper>
      
      <Box sx={{ width: '100%' }}>
        {activeTab === 0 && <BooksReport />}
        {activeTab === 1 && <MembersReport />}
        {activeTab === 2 && <CirculationReport />}
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleCloseSnackbar}
            >
              <Close fontSize="small" />
            </IconButton>
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Reports;
