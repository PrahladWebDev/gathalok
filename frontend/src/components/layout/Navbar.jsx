import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { openAuthModal } from '../../store/slices/uiSlice';
import toast from 'react-hot-toast';
import './Navbar.css';

const Navbar = () => {
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out. Farewell, seeker of tales.');
    navigate('/');
    setProfileOpen(false);
  };

  const navLinks = [
    { to: '/', label: 'Home', exact: true },
    { to: '/explore', label: 'Explore' },
    { to: '/map', label: 'World Map' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner container">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-symbol">॥</span>
          <span className="navbar__logo-text">GathaLok</span>
        </Link>

        {/* Desktop Nav */}
        <ul className="navbar__links">
          {navLinks.map(l => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.exact}
                className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right: Auth / User */}
        <div className="navbar__actions">
          {user ? (
            <div className="navbar__profile" ref={profileRef}>
              <button
                className="navbar__avatar-btn"
                onClick={() => setProfileOpen(p => !p)}
                aria-label="Open profile menu"
              >
                {user.avatar?.url
                  ? <img src={user.avatar.url} alt={user.name} className="navbar__avatar-img" />
                  : <div className="navbar__avatar-fallback">{user.name[0].toUpperCase()}</div>
                }
                <span className="navbar__username">{user.name.split(' ')[0]}</span>
                <span className="navbar__chevron">{profileOpen ? '▲' : '▾'}</span>
              </button>

              {profileOpen && (
                <div className="navbar__dropdown">
                  <div className="navbar__dropdown-header">
                    <p className="navbar__dropdown-name">{user.name}</p>
                    <p className="navbar__dropdown-role">{user.role}</p>
                  </div>
                  <div className="navbar__dropdown-divider" />
                  <Link to="/profile" className="navbar__dropdown-item" onClick={() => setProfileOpen(false)}>👤 Profile</Link>
                  <Link to="/bookmarks" className="navbar__dropdown-item" onClick={() => setProfileOpen(false)}>🔖 Bookmarks</Link>
                  <Link to="/history" className="navbar__dropdown-item" onClick={() => setProfileOpen(false)}>📜 Reading History</Link>
                  <Link to="/notifications" className="navbar__dropdown-item" onClick={() => setProfileOpen(false)}>🔔 Notifications</Link>
                  <Link to="/settings" className="navbar__dropdown-item" onClick={() => setProfileOpen(false)}>⚙️ Settings</Link>
                  {(user.role === 'contributor' || user.role === 'admin') && (
                    <Link to="/contribute" className="navbar__dropdown-item" onClick={() => setProfileOpen(false)}>✍️ Submit Story</Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin" className="navbar__dropdown-item navbar__dropdown-item--admin" onClick={() => setProfileOpen(false)}>⚙️ Admin Panel</Link>
                  )}
                  <div className="navbar__dropdown-divider" />
                  <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar__auth-btns">
              <button className="btn btn-ghost btn-sm" onClick={() => dispatch(openAuthModal('login'))}>Sign In</button>
              <button className="btn btn-gold btn-sm" onClick={() => dispatch(openAuthModal('register'))}>Join Free</button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className={`navbar__hamburger ${mobileOpen ? 'navbar__hamburger--open' : ''}`}
            onClick={() => setMobileOpen(p => !p)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="navbar__mobile">
          {navLinks.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.exact}
              className={({ isActive }) => `navbar__mobile-link ${isActive ? 'navbar__mobile-link--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          {!user && (
            <div className="navbar__mobile-auth">
              <button className="btn btn-ghost btn-full" onClick={() => { dispatch(openAuthModal('login')); setMobileOpen(false); }}>Sign In</button>
              <button className="btn btn-gold btn-full" onClick={() => { dispatch(openAuthModal('register')); setMobileOpen(false); }}>Join Free</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
