import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { verifyEmail } from '../store/slices/authSlice';
import { openAuthModal } from '../store/slices/uiSlice';
import './AuthPage.css';

const VerifyEmail = () => {
  const { token } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const res = await dispatch(verifyEmail(token));
      if (res.meta.requestStatus === 'fulfilled') {
        setStatus('success');
        setMessage(res.payload.message || 'Your email has been verified.');
        if (res.payload.token) toast.success('Welcome to GathaLok!');
      } else {
        setStatus('error');
        setMessage(res.payload?.message || 'This verification link is invalid or has expired.');
      }
    })();
  }, [dispatch, token]);

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__accent" />

        <div className="auth-page__logo">
          <span className="auth-page__om">॥</span>
          <span className="auth-page__brand">GathaLok</span>
        </div>

        {status === 'verifying' && (
          <>
            <div className="auth-page__icon">⏳</div>
            <h1 className="auth-page__title">Verifying…</h1>
            <p className="auth-page__subtitle">Please wait while we confirm your email.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="auth-page__icon">✅</div>
            <h1 className="auth-page__title">Email Verified</h1>
            <p className="auth-page__subtitle">{message}</p>
            <button className="btn btn-gold btn-full btn-lg" onClick={() => navigate('/')}>
              {user ? 'Continue to GathaLok' : 'Go to Home'}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="auth-page__icon">⚠️</div>
            <h1 className="auth-page__title">Verification Failed</h1>
            <p className="auth-page__subtitle">{message}</p>
            <button
              className="btn btn-gold btn-full btn-lg"
              onClick={() => { navigate('/'); dispatch(openAuthModal('login')); }}
            >
              Sign In
            </button>
          </>
        )}

        <p className="auth-page__switch">
          <Link to="/">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
