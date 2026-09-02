import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer__grid">
        {/* Brand */}
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            <span className="footer__logo-symbol">॥</span>
            <span className="footer__logo-text">GathaLok</span>
          </Link>
          <p className="footer__tagline">
            Preserving the world's folklore, myths, and oral traditions for generations to come.
            Every story matters.
          </p>
          <div className="footer__badge">
            <span>🌍 Made with love for storytellers everywhere</span>
          </div>
        </div>

        {/* Explore */}
        <div className="footer__col">
          <h4 className="footer__col-title">Explore</h4>
          <nav className="footer__links">
            <Link to="/explore">All Stories</Link>
            <Link to="/map">World Map</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            <Link to="/explore?category=ghost-stories">Ghost Stories</Link>
            <Link to="/explore?category=mythological-creatures">Mythological Creatures</Link>
          </nav>
        </div>

        {/* Popular Countries */}
        <div className="footer__col">
          <h4 className="footer__col-title">Popular Countries</h4>
          <nav className="footer__links">
            {['India', 'Mexico', 'Ireland', 'Japan', 'Egypt', 'Greece'].map(c => (
              <Link key={c} to={`/countries/${encodeURIComponent(c)}`}>{c}</Link>
            ))}
          </nav>
        </div>

        {/* Contribute */}
        <div className="footer__col">
          <h4 className="footer__col-title">Contribute</h4>
          <nav className="footer__links">
            <Link to="/contribute">Submit a Story</Link>
            <Link to="/profile">Your Profile</Link>
            <Link to="/bookmarks">Bookmarks</Link>
          </nav>
        </div>
      </div>

      <div className="footer__bottom">
        <p className="footer__copy">© {new Date().getFullYear()} GathaLok. Built with React, Node.js & MongoDB.</p>
        <p className="footer__quote">"Stories are the threads that weave civilization." — Ancient Indian Proverb</p>
      </div>
    </div>
  </footer>
);

export default Footer;
