import React, { useState, useEffect } from "react";
import SplashScreen from "./pages/SplashScreen";
import Login from "./pages/Login";
import Main from "./pages/Main";
import "./index.css";

// Fallback styles in case CSS file fails to load
const fallbackStyles = `
  :root {
    --primary-dark: #780000;
    --primary: #c1121f;
    --light: #fdf0d5;
    --secondary-dark: #002f48;
    --secondary: #669bbc;
    --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  body {
    margin: 0;
    padding: 0;
    font-family: var(--font-sans);
    background-color: var(--light);
    color: var(--secondary-dark);
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }
  
  #root {
    height: 100%;
    width: 100%;
  }
  
  * {
    box-sizing: border-box;
  }
`;

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [cssLoaded, setCssLoaded] = useState(false);

  useEffect(() => {
    // Inject fallback styles
    const styleElement = document.createElement('style');
    styleElement.innerHTML = fallbackStyles;
    document.head.appendChild(styleElement);

    // Check if CSS loaded properly - we'll remove fallback styles if it did
    const checkCssLoaded = () => {
      // Simple check - if body has expected background, CSS likely loaded
      const bodyStyle = window.getComputedStyle(document.body);
      if (bodyStyle.backgroundColor === 'rgb(253, 240, 213)') {
        setCssLoaded(true);
        // Remove fallback styles if we don't need them
        document.head.removeChild(styleElement);
      }
    };
    
    setTimeout(checkCssLoaded, 500);

    // Simulate splash screen delay
    const timer = setTimeout(() => {
      setIsLoading(false);
      console.log("Splash screen timer completed, setting isLoading to false");
    }, 3000);

    // When the app loads, ensure the tables are updated with the needed fields
    if (window.api) {
      window.api
        .updateMembersTable()
        .then(() => console.log("Member table structure updated successfully"))
        .catch((err) => console.error("Error updating member table:", err));

      window.api
        .updateBooksTable()
        .then(() => console.log("Books table structure updated successfully"))
        .catch((err) => console.error("Error updating books table:", err));
    }

    return () => clearTimeout(timer);
  }, []);

  console.log("App component rendering, isLoading:", isLoading);

  const handleLogin = (userData) => {
    console.log("Login successful with user:", userData);
    setUser(userData);
    setIsAuthenticated(true);
    setAuthError(null);
    return true;
  };

  const handleLogout = () => {
    console.log("Logging out user:", user?.username);
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <Main user={user} onLogout={handleLogout} />;
};

export default App;
