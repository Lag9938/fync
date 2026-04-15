import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FinanceProvider } from './contexts/FinanceContext';
import { AnimatePresence } from 'framer-motion';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FinnOnboarding from './components/FinnOnboarding';

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <>
                <FinnOnboarding />
                <Dashboard />
              </>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
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
          <AnimatedRoutes />
        </Router>
      </FinanceProvider>
    </AuthProvider>
  );
}

export default App;

