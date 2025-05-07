import React, { useState, useEffect } from "react";
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Snackbar,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  Container,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { 
  Book, 
  People, 
  MenuBook, 
  Assignment, 
  TrendingUp, 
  Category, 
  CalendarMonth,
  AccessTime
} from "@mui/icons-material";
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

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalBooks: 0,
    activeMembers: 0,
    booksCheckedOut: 0,
    pendingReturns: 0,
    totalShelves: 0,
    totalLoans: 0,
    overdueRate: 0,
    returnRate: 0
  });
  const [popularBooks, setPopularBooks] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [monthlyCheckouts, setMonthlyCheckouts] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Get dashboard statistics
        const statsResult = await window.api.getDashboardStats();
        if (statsResult.success) {
          // Calculate additional stats
          const enhancedStats = {
            ...statsResult.data,
            totalShelves: statsResult.data.totalShelves || 0,
            totalLoans: statsResult.data.totalLoans || 0,
            returnRate: statsResult.data.returnRate || 85, // Default if not available
            overdueRate: statsResult.data.pendingReturns > 0 && statsResult.data.booksCheckedOut > 0
              ? Math.round((statsResult.data.pendingReturns / statsResult.data.booksCheckedOut) * 100)
              : 0
          };
          setStats(enhancedStats);
        } else {
          console.error("Failed to fetch dashboard stats:", statsResult.error);
        }

        // Get popular books
        const booksResult = await window.api.getMostPopularBooks(8); // Increased to 8 for better display
        if (booksResult.success) {
          setPopularBooks(booksResult.data);
        } else {
          console.error("Failed to fetch popular books:", booksResult.error);
        }

        // Get popular categories
        const categoriesResult = await window.api.getPopularCategories(8); // Increased to 8 for better display
        if (categoriesResult.success) {
          setPopularCategories(categoriesResult.data);
        } else {
          console.error(
            "Failed to fetch popular categories:",
            categoriesResult.error
          );
        }

        // Get monthly checkouts
        const fetchMonthlyCheckouts = async () => {
          try {
            const months = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];

            let monthlyData = [];
            let apiFound = false;

            // Try different approaches in order of preference
            if (typeof window.api.getMonthlyCheckouts === "function") {
              try {
                const result = await window.api.getMonthlyCheckouts();
                if (result && result.success && Array.isArray(result.data)) {
                  monthlyData = result.data;
                  apiFound = true;
                  console.log(
                    "Successfully fetched monthly checkouts via getMonthlyCheckouts()"
                  );
                }
              } catch (apiError) {
                console.warn("Error using getMonthlyCheckouts():", apiError);
              }
            }

            // Try DB API if direct API failed
            if (!apiFound && typeof window.api.db?.query === "function") {
              try {
                const currentYear = new Date().getFullYear();
                const query = `
                  SELECT strftime('%m', checkout_date) as month, COUNT(*) as count 
                  FROM loans 
                  WHERE strftime('%Y', checkout_date) = ? 
                  GROUP BY strftime('%m', checkout_date) 
                  ORDER BY month
                `;

                const results = await window.api.db.query(query, [
                  currentYear.toString(),
                ]);

                if (Array.isArray(results)) {
                  // Map the results to the format needed by the chart
                  monthlyData = months.map((monthName, index) => {
                    const monthNumber = (index + 1).toString().padStart(2, "0");
                    const monthData = results.find(
                      (r) => r.month === monthNumber
                    );
                    return {
                      month: monthName,
                      count: monthData ? parseInt(monthData.count) : 0,
                    };
                  });
                  apiFound = true;
                  console.log(
                    "Successfully fetched monthly checkouts via DB query"
                  );
                }
              } catch (dbError) {
                console.warn("Error querying loans table:", dbError);
              }
            }

            // If both approaches failed, use empty data
            if (!apiFound) {
              console.warn(
                "No API found for monthly checkouts, using empty data"
              );
              monthlyData = months.map((month) => ({ month, count: 0 }));
            }

            setMonthlyCheckouts(monthlyData);
          } catch (error) {
            console.error("Failed to fetch monthly checkouts:", error);
            // Set empty data on error
            setMonthlyCheckouts(
              [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((month) => ({ month, count: 0 }))
            );
          }
        };

        fetchMonthlyCheckouts();

        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "Failed to load dashboard data");
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // StatCard component with improved responsiveness
  const StatCard = ({ icon, title, value, color, subtitle }) => (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 3 },
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        borderRadius: 2,
        borderLeft: `4px solid ${color}`,
        transition: "transform 0.3s ease",
        "&:hover": {
          transform: "translateY(-5px)",
          boxShadow: 6
        }
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
        <Box
          sx={{
            backgroundColor: `${color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            width: 40,
            height: 40,
          }}
        >
          {React.cloneElement(icon, { sx: { color: color } })}
        </Box>
      </Box>
      <Typography
        variant="h3"
        component="div"
        sx={{ fontWeight: "bold", mb: 1, fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' } }}
      >
        {loading ? <CircularProgress size={24} /> : value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );

  // RateCard with improved responsiveness
  const RateCard = ({ title, value, color, icon }) => (
    <Card sx={{ 
      height: '100%', 
      width: '100%',
      borderLeft: `4px solid ${color}` 
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
              width: 40,
              height: 40,
              mr: 2
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ flexGrow: 1, mr: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={value} 
              sx={{ 
                height: 10, 
                borderRadius: 5,
                backgroundColor: `${color}40`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color,
                }
              }} 
            />
          </Box>
          <Typography variant="h6" component="div" sx={{ minWidth: 45 }}>
            {value}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          Error loading dashboard: {error}
        </Typography>
      </Box>
    );
  }

  // Define chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  // Prepare data for pie chart
  const categoryPieData = popularCategories.map(category => ({
    name: category.category || 'Unknown',
    value: category.count
  }));

  // Get current theme and breakpoints
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3 }, pb: 4, maxWidth: '100%' }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ 
          fontWeight: "bold", 
          color: "var(--secondary-dark)", 
          mb: 3,
          width: '100%',
          borderBottom: '2px solid var(--primary)',
          pb: 1,
          fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' }
        }}
      >
        Library System Dashboard
      </Typography>

      {/* Primary Stats */}
      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<Book />}
            title="Total Books"
            value={stats.totalBooks}
            color="var(--primary)"
            subtitle="Total books in inventory"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<People />}
            title="Active Members"
            value={stats.activeMembers}
            color="var(--secondary)"
            subtitle="Registered library members"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<MenuBook />}
            title="Books Checked Out"
            value={stats.booksCheckedOut}
            color="#ff9800"
            subtitle="Currently borrowed books"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<Assignment />}
            title="Pending Returns"
            value={stats.pendingReturns}
            color="#f44336"
            subtitle="Books overdue for return"
          />
        </Grid>
      </Grid>

      {/* System Usage Stats */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2, mt: 3, width: '100%', fontSize: { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' } }}>
        System Statistics
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        <Grid item xs={12} sm={6} lg={3}>
          <RateCard
            title="Return Rate"
            value={stats.returnRate}
            color="#4caf50"
            icon={<TrendingUp sx={{ color: "#4caf50" }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <RateCard
            title="Overdue Rate"
            value={stats.overdueRate}
            color="#f44336"
            icon={<AccessTime sx={{ color: "#f44336" }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<Category />}
            title="Total Shelves"
            value={stats.totalShelves || 'N/A'}
            color="#9c27b0"
            subtitle="Book storage locations"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={<CalendarMonth />}
            title="Total Loans"
            value={stats.totalLoans || 'N/A'}
            color="#2196f3"
            subtitle="All-time checkouts"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2, mt: 3, width: '100%', fontSize: { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' } }}>
        Analytics & Trends
      </Typography>
      <Grid container spacing={2} sx={{ width: '100%' }}>
        {/* Monthly Checkouts Chart */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={3}
            sx={{ 
              p: { xs: 2, sm: 3 }, 
              borderRadius: 2, 
              height: "100%", 
              width: "100%",
              minHeight: { xs: 300, sm: 400 },
              transition: "transform 0.3s ease",
              "&:hover": {
                transform: "translateY(-5px)",
                boxShadow: 6
              }
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ mb: 1, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Monthly Checkouts
            </Typography>

            <Box sx={{ height: { xs: 250, sm: 350 }, width: "100%" }}>
              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyCheckouts}
                    margin={{
                      top: 5,
                      right: isSmallScreen ? 5 : 30,
                      left: isSmallScreen ? 0 : 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: isSmallScreen ? 10 : 12 }} />
                    <YAxis tick={{ fontSize: isSmallScreen ? 10 : 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: isSmallScreen ? 10 : 12 }} />
                    <Bar
                      dataKey="count"
                      fill="var(--primary)"
                      name="Book Checkouts"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Categories Pie Chart */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={3}
            sx={{ 
              p: { xs: 2, sm: 3 }, 
              borderRadius: 2, 
              height: "100%", 
              width: "100%",
              minHeight: { xs: 300, sm: 400 },
              transition: "transform 0.3s ease",
              "&:hover": {
                transform: "translateY(-5px)",
                boxShadow: 6
              }
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ mb: 1, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Book Categories Distribution
            </Typography>

            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ height: { xs: 250, sm: 350 }, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={isSmallScreen ? 80 : 120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => 
                        isSmallScreen 
                          ? `${(percent * 100).toFixed(0)}%` 
                          : `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} books`, 'Count']} />
                    {!isSmallScreen && <Legend />}
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Popular Books */}
        <Grid item xs={12}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: { xs: 2, sm: 3 }, 
              borderRadius: 2,
              width: '100%',
              transition: "transform 0.3s ease",
              "&:hover": {
                transform: "translateY(-5px)",
                boxShadow: 6
              }
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ mb: 1, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Most Popular Books
            </Typography>

            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "200px",
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2} sx={{ width: '100%' }}>
                {popularBooks.length === 0 ? (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      No checkout data available
                    </Typography>
                  </Grid>
                ) : (
                  popularBooks.map((book, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: "background.paper",
                          boxShadow: 1,
                          height: '100%',
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: "transform 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-3px)",
                            boxShadow: 3
                          }
                        }}
                      >
                        <Typography 
                          variant="subtitle1" 
                          gutterBottom
                          sx={{ 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {book.title}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          {book.author}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mt: 'auto',
                            pt: 1
                          }}
                        >
                          <Typography 
                            variant="body2"
                            sx={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '70%'
                            }}
                          >
                            {book.category || "Unknown"}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ 
                              fontWeight: "bold", 
                              color: "var(--primary)",
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <MenuBook sx={{ fontSize: 16, mr: 0.5 }} />
                            {book.checkout_count}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))
                )}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;
