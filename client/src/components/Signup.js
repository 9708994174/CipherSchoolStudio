import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.scss'; // reuse same white-card styles

function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { signupUser, isAuthenticated, error: authError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      navigate(redirect || '/');
    }
  }, [isAuthenticated, navigate]);

  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = 'Username is required';
    else if (username.length < 3) e.username = 'At least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) e.username = 'Letters, numbers, underscores only';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm password';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true); setErrors({});
    const result = await signupUser(username, email, password);
    if (result.success) {
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      navigate(redirect || '/');
    } else {
      const msg = result.error || 'Signup failed.';
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg });
      else if (msg.toLowerCase().includes('user')) setErrors({ username: msg });
      else setErrors({ general: msg });
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__brand" onClick={() => navigate('/')}>
          CipherSQLStudio
        </h1>
        <p className="auth-card__tagline">Create your account</p>

        {(errors.general || authError) && (
          <div className="auth-card__error">{errors.general || authError}</div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__group">
            <input
              className="auth-form__input"
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
            {errors.username && <span className="auth-form__field-err">{errors.username}</span>}
          </div>

          <div className="auth-form__group">
            <input
              className="auth-form__input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {errors.email && <span className="auth-form__field-err">{errors.email}</span>}
          </div>

          <div className="auth-form__group">
            <input
              className="auth-form__input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {errors.password && <span className="auth-form__field-err">{errors.password}</span>}
          </div>

          <div className="auth-form__group">
            <input
              className="auth-form__input"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            {errors.confirmPassword && <span className="auth-form__field-err">{errors.confirmPassword}</span>}
          </div>

          <button
            className="auth-form__submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{' '}
          <Link to={`/login${window.location.search}`} className="auth-card__link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
