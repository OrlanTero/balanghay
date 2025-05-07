
const React = require('react');
const ReactDOM = require('react-dom/client');

// Use the SimpleApp component that doesn't require JSX compilation
try {
  const { default: App } = require('./SimpleApp');
  
  if (App) {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  }
} catch (error) {
  console.error('Failed to load App component:', error);
  document.getElementById('root').innerHTML = '<div style="color: red; padding: 20px;">Error loading application. See console for details.</div>';
}
  