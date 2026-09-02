import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearError } from '../../store/slices/authSlice';
import { closeAuthModal, openAuthModal } from '../../store/slices/uiSlice';
import toast from 'react-hot-toast';
import './AuthModal.css';

const AuthModal = () => {
  const dispatch = useDispatch();
  const { authModal } = useSelector(s => s.ui);
  const { loading, error } = useSelector(s => s.auth);

  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });

  useEffect(() => {
    dispatch(clearError());
    setForm({ name: '', username: '', email: '', password: '' });
  }, [authModal, dispatch]);

  if (!authModal) return null;
  const isLogin = authModal === 'login';

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const action = isLogin
      ? login({ email: form.email, password: form.password })
      : register(form);
    const res = await dispatch(action);
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success(isLogin ? 'Welcome back, seeker of tales!' : 'Welcome to GathaLok!');
      dispatch(closeAuthModal());
    }
  };

  return (
    <div className="auth-overlay" onClick={() => dispatch(closeAuthModal())}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        {/* Decorative top border */}
        <div className="auth-modal__accent" />

        <button className="auth-modal__close" onClick={() => dispatch(closeAuthModal())}>✕</button>

        <div className="auth-modal__logo">
          <span className="auth-modal__om">॥</span>
          <span className="auth-modal__brand">GathaLok</span>
        </div>

        <h2 className="auth-modal__title">
          {isLogin ? 'Welcome Back' : 'Begin Your Journey'}
        </h2>
        <p className="auth-modal__subtitle">
          {isLogin
            ? 'Sign in to continue exploring Indian folklore'
            : 'Join thousands discovering India\'s mythological heritage'}
        </p>

        <form onSubmit={submit} className="auth-modal__form">
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                name="name"
                value={form.name}
                onChange={handle}
                placeholder="Arjun Sharma"
                required
              />
            </div>
          )}
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                name="username"
                value={form.username}
                onChange={handle}
                placeholder="arjunsharma"
                pattern="[a-z0-9_]{3,20}"
                title="3-20 chars: lowercase letters, numbers, underscores"
                required
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              name="email"
              type="email"
              value={form.email}
              onChange={handle}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              name="password"
              type="password"
              value={form.password}
              onChange={handle}
              placeholder={isLogin ? '••••••••' : 'Min 6 characters'}
              minLength={6}
              required
            />
          </div>

          {error && <p className="auth-modal__error">⚠ {error}</p>}

          <button type="submit" className="btn btn-gold btn-full btn-lg" disabled={loading}>
            {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="auth-modal__switch">
          {isLogin ? "Don't have an account? " : 'Already a member? '}
          <button
            className="auth-modal__switch-btn"
            onClick={() => dispatch(openAuthModal(isLogin ? 'register' : 'login'))}
          >
            {isLogin ? 'Join free' : 'Sign in'}
          </button>
        </p>

        {!isLogin && (
          <p className="auth-modal__terms">
            By joining, you agree to our Terms of Service and Privacy Policy.
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
