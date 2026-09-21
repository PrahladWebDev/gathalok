import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword, clearError } from '../store/slices/authSlice';
import './AuthPage.css';

const ForgotPassword = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector(s => s.auth);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const res = await dispatch(forgotPassword(email));
    if (res.meta.requestStatus === 'fulfilled') setSent(true);
  };

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__accent" />

        <div className="auth-page__logo">
          <span className="auth-page__om">॥</span>
          <span className="auth-page__brand">GathaLok</span>
        </div>

        {sent ? (
          <>
            <div className="auth-page__icon">✉️</div>
            <h1 className="auth-page__title">Check Your Email</h1>
            <p className="auth-page__subtitle">
              If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
              It expires in 1 hour.
            </p>
          </>
        ) : (
          <>
            <h1 className="auth-page__title">Forgot Password</h1>
            <p className="auth-page__subtitle">
              Enter the email associated with your account and we'll send you a link to reset your password.
            </p>

            <form onSubmit={submit} className="auth-page__form">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {error?.message && <p className="auth-page__error">⚠ {error.message}</p>}

              <button type="submit" className="btn btn-gold btn-full btn-lg" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        <p className="auth-page__switch">
          <Link to="/">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
