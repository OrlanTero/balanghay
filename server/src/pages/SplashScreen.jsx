import React, { useEffect, useState } from "react";

// Base64 encoded small placeholder logo as fallback
// This ensures we always have something to display even if file loading fails
const fallbackLogoBase64 = "data:image/png;base64,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";

const SplashScreen = () => {
  const [fadeIn, setFadeIn] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoSrc, setLogoSrc] = useState(fallbackLogoBase64); // Start with fallback
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // Track any errors that might occur during startup
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event);
      setErrorMsg(event.message || 'An error occurred during startup');
    });

    // Add a small delay before fading in for a smoother animation
    const timer = setTimeout(() => {
      setFadeIn(true);
    }, 100);

    // Get the resource path for the logo
    const getLogoPath = async () => {
      try {
        if (window.api && typeof window.api.getResourcePath === 'function') {
          console.log('Requesting logo path from main process...');
          try {
            const path = await window.api.getResourcePath('logo.png');
            console.log('Got logo path:', path);
            if (path) {
              setLogoSrc(path);
            }
          } catch (innerError) {
            console.error('Error in getResourcePath:', innerError);
            // Keep using fallback
          }
        } else {
          console.warn('API for resource paths not available, using fallback');
        }
      } catch (error) {
        console.error('Error getting logo path:', error);
        // Already using fallback image by default
      }
    };

    // Execute with error handling
    try {
      getLogoPath().catch(err => {
        console.error('Async error in getLogoPath:', err);
      });
    } catch (e) {
      console.error('Error executing getLogoPath:', e);
    }

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    backgroundColor: "var(--secondary-dark)",
    color: "var(--light)",
    opacity: fadeIn ? 1 : 0,
    transition: "opacity 1s ease-in-out",
  };

  const logoStyle = {
    width: "200px",
    marginBottom: "20px",
  };

  const titleStyle = {
    fontSize: "2.5rem",
    marginBottom: "10px",
    fontWeight: "bold",
    textAlign: "center",
  };

  const subtitleStyle = {
    fontSize: "1.5rem",
    opacity: 0.9,
    textAlign: "center",
  };

  const fallbackLogoStyle = {
    ...logoStyle,
    height: "200px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
    padding: "20px",
  };

  const errorStyle = {
    color: '#ffcccc',
    margin: '10px 0',
    padding: '8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    maxWidth: '80%',
    textAlign: 'center',
    fontSize: '0.9rem'
  };

  const handleImageError = (e) => {
    console.error("Error loading logo:", e);
    setLogoError(true);
    // Switch to fallback base64 image
    setLogoSrc(fallbackLogoBase64);
  };

  return (
    <div style={containerStyle}>
      {logoError ? (
        <div style={fallbackLogoStyle}>
          <span style={{ fontSize: "2rem" }}>HB</span>
        </div>
      ) : (
        <img 
          src={logoSrc} 
          alt="Hiraya Balanghay Logo" 
          style={logoStyle} 
          onError={handleImageError}
        />
      )}
      <h1 style={titleStyle}>Hiraya Balanghay</h1>
      <p style={subtitleStyle}>Library Management System</p>
      
      {errorMsg && (
        <div style={errorStyle}>
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
