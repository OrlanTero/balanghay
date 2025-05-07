import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App.jsx';
import '../index.css';

// Initialize React app
const root = createRoot(document.getElementById('root'));
root.render(<App />); 