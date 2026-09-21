import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { resetPassword, clearError } from '../store/slices/authSlice';
import './AuthPage.css';

const ResetPassword = () => {
  const { token } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(s => s.auth);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    dispatch(clearError());

    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);

    const res = await dispatch(resetPassword({ token, password }));
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Password reset successfully! Welcome back.');
      navigate('/');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__accent" />

        <div className="auth-page__logo">
          <span className="auth-page__om">॥</span>
          <span className="auth-page__brand">GathaLok</span>
        </div>

        <h1 className="auth-page__title">Reset Password</h1>
        <p className="auth-page__subtitle">Choose a new password for your account.</p>

        <form onSubmit={submit} className="auth-page__form">
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              minLength={6}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              className="form-input"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              minLength={6}
              required
            />
          </div>

          {mismatch && <p className="auth-page__error">⚠ Passwords do not match.</p>}
          {error?.message && <p className="auth-page__error">⚠ {error.message}</p>}

          <button type="submit" className="btn btn-gold btn-full btn-lg" disabled={loading}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>

        <p className="auth-page__switch">
          <Link to="/forgot-password">Need a new link?</Link>
          {' · '}
          <Link to="/">Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
