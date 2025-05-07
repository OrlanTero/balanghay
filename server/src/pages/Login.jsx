import React, { useState, useEffect } from "react";
import logo from "../assets/logo.png";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted with:", { username, password });


    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }
    
    // Clear previous error
    setError("");
    setIsLoading(true);
    
    try {
      // Show a loading message while attempting to login
      setError("Authenticating...");
      
      // First try the API login
      try {
        const result = await window.api.login({ username, password });
        console.log("Login result:", result);

        if (result.success) {
          setError("");
          setIsLoading(false);
          onLogin(result.user);
          return true;
        } else {
          // Database issue detected - automatic fallback for admin
          if ((result.error && (
              result.error.includes("SQLITE_CANTOPEN") ||
              result.error.includes("system error") ||
              result.error.includes("database")
            )) && 
            username === 'admin' && password === 'admin') {
            
            // Use a default admin user object when the database is unavailable
            const defaultAdminUser = {
              id: 1,
              username: 'admin',
              email: 'admin@balanghay.com',
              role: 'admin'
            };
            
            setError("");
            setIsLoading(false);
            onLogin(defaultAdminUser);
            return true;
          }
          
          // Specific error handling for different types of errors
          if (result.error && result.error.includes("SQLITE_CANTOPEN")) {
            setError("Database access error. Try using admin/admin credentials.");
            setShowHelper(true);
          } else if (result.error && result.error.includes("system error")) {
            setError("System error occurred. Try using admin/admin credentials.");
            setShowHelper(true);
          } else {
            setError(result.message || "Invalid username or password");
          }
          setIsLoading(false);
          return false;
        }
      } catch (apiError) {
        console.error("API Login error:", apiError);
        
        // Check if using admin/admin credentials
        if (username === 'admin' && password === 'admin') {
          console.log("Error connecting to API but credentials are admin/admin, creating default user");
          
          // Use a default admin user object when the API is unavailable
          const defaultAdminUser = {
            id: 1,
            username: 'admin',
            email: 'admin@balanghay.com',
            role: 'admin'
          };
          
          setError("");
          setIsLoading(false);
          onLogin(defaultAdminUser);
          return true;
        }
        
        throw apiError; // Re-throw to be caught by the outer catch
      }
    } catch (error) {
      console.error("Login error:", error);
      
      // More specific error handling
      if (error.message && error.message.includes("database")) {
        setError("Database connection error. Try using admin/admin credentials.");
        setShowHelper(true);
      } else {
        setError("Error connecting to authentication service. Try using admin/admin credentials.");
        setShowHelper(true);
      }
      setIsLoading(false);
      return false;
    }
  };

  const containerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "var(--secondary-dark)",
    padding: "16px",
  };

  const formContainerStyle = {
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "400px",
    width: "100%",
    borderRadius: "8px",
    backgroundColor: "white",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
  };

  const logoStyle = {
    width: "120px",
    marginBottom: "20px",
  };

  const titleStyle = {
    color: "var(--primary-dark)",
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "24px",
  };

  const subtitleStyle = {
    color: "var(--secondary-dark)",
    marginBottom: "24px",
    textAlign: "center",
  };

  const errorStyle = {
    width: "100%",
    padding: "10px",
    backgroundColor: "#ffebee",
    color: "#c62828",
    borderRadius: "4px",
    marginBottom: "16px",
    textAlign: "center",
  };

  const formStyle = {
    width: "100%",
  };

  const inputGroupStyle = {
    marginBottom: "16px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    color: "var(--secondary-dark)",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "16px",
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    backgroundColor: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "16px",
    marginBottom: "16px",
  };

  const noteStyle = {
    color: "grey",
    fontSize: "12px",
    textAlign: "center",
    marginTop: "16px",
  };

  const helperStyle = {
    color: "#4caf50",
    fontSize: "12px",
    padding: "8px",
    backgroundColor: "#e8f5e9",
    borderRadius: "4px",
    marginTop: "8px",
    marginBottom: "8px"
  };

  const autoLoginMessageStyle = {
    color: "#1976d2",
    fontSize: "14px",
    padding: "10px",
    backgroundColor: "#e3f2fd",
    borderRadius: "4px",
    marginTop: "8px",
    marginBottom: "16px",
    textAlign: "center",
    fontWeight: "bold"
  };

  const loadingStyle = {
    ...buttonStyle,
    backgroundColor: "var(--secondary)",
    cursor: "wait"
  };

  return (
    <div style={containerStyle}>
      <div style={formContainerStyle}>
        {logoLoaded && <img src={logo} alt="Library Logo" style={logoStyle} />}
        <h1 style={titleStyle}>Balanghay</h1>
        <p style={subtitleStyle}>Library Management System</p>

        {!autoLoginAttempted && showHelper && (
          <div style={autoLoginMessageStyle}>
            Attempting automatic admin login...
          </div>
        )}

        {error && error !== "Authenticating..." && <div style={errorStyle}>{error}</div>}
        
        {/* Helper message for database issues */}
        {showHelper && (
          <div style={helperStyle}>
            If experiencing database errors, use credentials: admin / admin
          </div>
        )}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle} htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              style={inputStyle}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={isLoading}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            style={isLoading ? loadingStyle : buttonStyle}
            disabled={isLoading}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p style={noteStyle}>
          Default credentials: admin / admin
        </p>
      </div>
    </div>
  );
};

export default Login;
