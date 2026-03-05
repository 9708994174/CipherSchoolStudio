import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { signup, login, getCurrentUser } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const doLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setError(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('authUserId');
  }, []);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (parsedUser?.id) localStorage.setItem('authUserId', parsedUser.id);
      } catch (_) {
        // corrupted localStorage
        doLogout();
        setLoading(false);
        return;
      }

      // Verify token is still valid
      getCurrentUser(storedToken)
        .then(response => {
          // axios wraps response in .data
          const data = response.data || response;
          if (data.success) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          } else {
            // Token is invalid, clear storage
            doLogout();
          }
        })
        .catch(() => {
          // Network error or invalid token — keep user logged in optimistically
          // only clear if it was a 401 (handled by axios interceptor)
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [doLogout]);

  const signupUser = useCallback(async (username, email, password) => {
    try {
      setError(null);
      const response = await signup(username, email, password);

      // Check if response.data exists (axios wraps response)
      const data = response.data || response;

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('authUserId', data.user.id);
        return { success: true };
      } else {
        const errorMsg = data.error || data.message || 'Signup failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Signup failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const loginUser = useCallback(async (email, password) => {
    try {
      setError(null);
      const response = await login(email, password);

      // Check if response.data exists (axios wraps response)
      const data = response.data || response;

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('authUserId', data.user.id);
        return { success: true };
      } else {
        const errorMsg = data.error || data.message || 'Login failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = doLogout;

  const value = React.useMemo(() => ({
    user,
    token,
    loading,
    error,
    signupUser,
    loginUser,
    logout,
    isAuthenticated: !!user && !!token
  }), [user, token, loading, error, signupUser, loginUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

