import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Signup.scss';

function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signupUser, isAuthenticated, error: authError } = useAuth();
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
    
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (username.length > 30) {
      newErrors.username = 'Username cannot exceed 30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
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
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
    
    const result = await signupUser(username, email, password);
    
    if (result.success) {
      // Check if there's a redirect parameter
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      navigate(redirect || '/');
    } else {
      // Handle field-specific errors
      if (result.error) {
        if (result.error.includes('email') || result.error.includes('Email')) {
          setErrors({ email: result.error });
        } else if (result.error.includes('username') || result.error.includes('Username')) {
          setErrors({ username: result.error });
        } else {
          setErrors({ general: result.error });
        }
      } else {
        setErrors({ general: 'Signup failed. Please try again.' });
      }
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
              type="text"
              id="username"
              className={`leetcode-auth__input ${errors.username ? 'leetcode-auth__input--error' : ''}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              disabled={isSubmitting}
              autoComplete="username"
            />
            {errors.username && (
              <div className="leetcode-auth__field-error">{errors.username}</div>
            )}
          </div>
          
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
              autoComplete="new-password"
            />
            {errors.password && (
              <div className="leetcode-auth__field-error">{errors.password}</div>
            )}
          </div>
          
          <div className="leetcode-auth__field">
            <input
              type="password"
              id="confirmPassword"
              className={`leetcode-auth__input ${errors.confirmPassword ? 'leetcode-auth__input--error' : ''}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <div className="leetcode-auth__field-error">{errors.confirmPassword}</div>
            )}
          </div>
          
          <button
            type="submit"
            className="leetcode-auth__button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="leetcode-auth__footer">
          <span className="leetcode-auth__footer-text">
            Already have an account?{' '}
            <Link 
              to={`/login${window.location.search}`} 
              className="leetcode-auth__link"
            >
              Sign in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export default Signup;

