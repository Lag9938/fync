import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FinanceProvider } from './contexts/FinanceContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  React.useEffect(() => {
    // Load global theme color on app start
    const savedColor = localStorage.getItem('fync_theme_color');
    if (savedColor) {
      document.documentElement.style.setProperty('--primary-color', savedColor);
      // Rough approximation for hover state by slightly dimming
      document.documentElement.style.setProperty('--primary-hover', savedColor);
      // Transparent version for backgrounds
      document.documentElement.style.setProperty('--primary-light', `${savedColor}1a`); // 10% opacity in hex
    }
  }, []);

  return (
    <AuthProvider>
      <FinanceProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            {/* Redirect root to dashboard -> dashboard will redirect to login if not authenticated */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </FinanceProvider>
    </AuthProvider>
  );
}

export default App;
