import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.scss';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { loginUser, isAuthenticated, error: authError } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Check if there's a redirect parameter
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      navigate(redirect || '/');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    const result = await loginUser(email, password);
    
    if (result.success) {
      // Check if there's a redirect parameter
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      navigate(redirect || '/');
    } else {
      setErrors({ general: result.error || 'Login failed. Please try again.' });
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="leetcode-auth">
      <div className="leetcode-auth__container">
        <div className="leetcode-auth__logo">
          <h1 className="leetcode-auth__brand">CipherSQLStudio</h1>
        </div>
        
        <form className="leetcode-auth__form" onSubmit={handleSubmit}>
          {(errors.general || authError) && (
            <div className="leetcode-auth__error">
              {errors.general || authError}
            </div>
          )}
          
          <div className="leetcode-auth__field">
            <input
              type="email"
              id="email"
              className={`leetcode-auth__input ${errors.email ? 'leetcode-auth__input--error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              disabled={isSubmitting}
              autoComplete="email"
            />
            {errors.email && (
              <div className="leetcode-auth__field-error">{errors.email}</div>
            )}
          </div>
          
          <div className="leetcode-auth__field">
            <input
              type="password"
              id="password"
              className={`leetcode-auth__input ${errors.password ? 'leetcode-auth__input--error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            {errors.password && (
              <div className="leetcode-auth__field-error">{errors.password}</div>
            )}
          </div>
          
          <button
            type="submit"
            className="leetcode-auth__button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="leetcode-auth__footer">
          <span className="leetcode-auth__footer-text">
            Don't have an account?{' '}
            <Link 
              to={`/signup${window.location.search}`} 
              className="leetcode-auth__link"
            >
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export default Login;

