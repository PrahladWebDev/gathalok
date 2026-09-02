import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import store from './store';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AuthModal from './components/common/AuthModal';

// Pages
import Home          from './pages/Home';
import Explore       from './pages/Explore';
import MapPage       from './pages/MapPage';
import StoryDetail   from './pages/StoryDetail';
import Contribute    from './pages/Contribute';
import ContributeEdit from './pages/ContributeEdit';
import Profile       from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Leaderboard   from './pages/Leaderboard';
import CountryPage   from './pages/CountryPage';
import Settings      from './pages/Settings';
import Notifications from './pages/Notifications';

import './index.css';

// ─── Route guards ─────────────────────────────────────────
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useSelector(s => s.auth);
  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

// ─── App Shell ────────────────────────────────────────────
const AppShell = () => {
  const { authModal } = useSelector(s => s.ui);

  return (
    <BrowserRouter>
      <Navbar />
      {authModal && <AuthModal />}

      <main>
        <Routes>
          <Route path="/"             element={<Home />} />
          <Route path="/explore"      element={<Explore />} />
          <Route path="/map"          element={<MapPage />} />
          <Route path="/stories/:slug" element={<StoryDetail />} />
          <Route path="/countries/:countryName" element={<CountryPage />} />
          <Route path="/leaderboard"  element={<Leaderboard />} />

          <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/bookmarks"    element={<ProtectedRoute><Profile initialTab="bookmarks" /></ProtectedRoute>} />
          <Route path="/history"      element={<ProtectedRoute><Profile initialTab="history" /></ProtectedRoute>} />
          <Route path="/contribute"   element={<ProtectedRoute><Contribute /></ProtectedRoute>} />
          <Route path="/contribute/edit/:id" element={<ProtectedRoute><ContributeEdit /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/settings"     element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route path="/admin"        element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/stories" element={<Navigate to="/admin?tab=pending" replace />} />

          {/* 404 */}
          <Route path="*" element={
            <div style={{ paddingTop: '80px' }}>
              <div className="container">
                <div className="empty-state" style={{ padding: '10rem 0' }}>
                  <div className="icon">🌑</div>
                  <h3>Page Not Found</h3>
                  <p>The myth you're looking for doesn't exist here.</p>
                  <a href="/" className="btn btn-gold" style={{ margin: '1.5rem auto 0', display: 'inline-flex' }}>Return Home</a>
                </div>
              </div>
            </div>
          } />
        </Routes>
      </main>

      <Footer />

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--surface)',
            color: 'var(--ash)',
            border: '1px solid var(--border-2)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#B78C3E', secondary: '#0D0A1A' } },
          error:   { iconTheme: { primary: '#e87070', secondary: '#0D0A1A' } },
        }}
      />
    </BrowserRouter>
  );
};

// ─── Root ─────────────────────────────────────────────────
const App = () => (
  <Provider store={store}>
    <AppShell />
  </Provider>
);

export default App;
