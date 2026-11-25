import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import AppRoutes from './routes/AppRoutes';
import Login from './pages/Login';
import { DeviceStatusProvider } from './services/DeviceStatusContext';
import { ThemeProvider } from './context/ThemeContext';
import SplashScreen from './components/SplashScreen';
import brandLogo from './assets/trueisense.jpeg';
import loginLogo from './assets/logo.png';
import {
  initAuthSession,
  isTokenExpired,
  refreshAccessToken,
  getRefreshToken,
  getAccessToken,
  clearAuthSession,
  setAuthSession
} from './services/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true' && !!getAccessToken()
  );

  // Preload critical branding assets for instant rendering and cache hits
  useEffect(() => {
    const img1 = new Image();
    img1.src = brandLogo;
    const img2 = new Image();
    img2.src = loginLogo;
  }, []);

  // Track if splash should show (runs on fresh load/reload and login) - disabled for performance
  const [showSplash, setShowSplash] = useState(false);
  const prevAuthRef = useRef(isAuthenticated);

  // Auto-login from URL parameters (useful for iframe embedding)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlRole = urlParams.get('role');
    
    if (urlToken) {
      setAuthSession({
        accessToken: urlToken,
        user: { role: urlRole || 'USER', name: 'User' },
        expiresIn: 900
      });
      setIsAuthenticated(true);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Listen for storage changes (for login/logout across tabs if needed)
  useEffect(() => {
    const checkAuth = () => {
      const newAuth = localStorage.getItem('isAuthenticated') === 'true' && !!getAccessToken();
      prevAuthRef.current = newAuth;
      setIsAuthenticated(newAuth);
    };
    window.addEventListener('storage', checkAuth);
    window.addEventListener('storage-update', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('storage-update', checkAuth);
    };
  }, []);

  // Initialize and verify session on load / browser refresh
  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      const isValid = await initAuthSession();
      if (isMounted) {
        setIsAuthenticated(isValid);
      }
    };
    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Proactive token refresh & liveness manager
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRefresh = async () => {
      if (isTokenExpired()) {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const newToken = await refreshAccessToken();
          if (!newToken) {
            setIsAuthenticated(false);
          }
        } else {
          clearAuthSession();
          setIsAuthenticated(false);
        }
      }
    };

    // Check token freshness every 30 seconds
    const interval = setInterval(checkAndRefresh, 30 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <ThemeProvider>
      <DeviceStatusProvider>
        {/* Splash screen overlay — shows only on fresh login */}
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}

        <Router>
          <Routes>
            {/* LOGIN ROUTE */}
            <Route 
              path="/login" 
              element={!isAuthenticated ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to={localStorage.getItem('userRole') === 'SUPER_ADMIN' ? "/super-admin" : "/dashboard"} replace />} 
            />

            {/* PROTECTED ROUTES */}
            <Route
              path="/*"
              element={
                isAuthenticated ? (
                  <MainLayout>
                    <AppRoutes />
                  </MainLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </Router>
      </DeviceStatusProvider>
    </ThemeProvider>
  );
}

export default App;
