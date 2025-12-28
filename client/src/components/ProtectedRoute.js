import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show nothing while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#808080'
      }}>
        <div style={{ color: '#ffffff', fontSize: '16px' }}>Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated, preserving the current path
  if (!isAuthenticated) {
    // Preserve the current path as redirect parameter
    const redirectPath = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  // Render protected content
  return children;
}

export default ProtectedRoute;


