import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

// ─── Review Modal ─────────────────────────────────────────
const ReviewModal = ({ story, type, onConfirm, onClose }) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const config = {
    rejected: {
      title: '❌ Reject Story',
      label: 'Reason for rejection (optional)',
      placeholder: 'e.g. Inaccurate information, inappropriate content…',
      btnLabel: 'Reject Story',
      btnStyle: { background: 'rgba(139,26,26,0.4)', color: '#e87070', border: '1px solid #e8707040' },
      requireNote: false,
    },
    changes_requested: {
      title: '✏️ Request Changes',
      label: 'What changes are needed? (required)',
      placeholder: 'e.g. Please add more historical context, fix grammatical errors…',
      btnLabel: 'Send Request',
      btnStyle: { background: 'rgba(200,120,0,0.3)', color: '#e8c97a', border: '1px solid #e8c97a40' },
      requireNote: true,
    },
  };

  const cfg = config[type];

  const handleConfirm = async () => {
    if (cfg.requireNote && !note.trim()) {
      toast.error('Please describe what changes are needed.');
      return;
    }
    setLoading(true);
    await onConfirm(story._id, type, note.trim());
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <h3 className="modal-title">{cfg.title}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
          <strong>{story.title}</strong> by {story.contributor?.name}
        </p>
        <div style={{ marginTop: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {cfg.label}
          </label>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder={cfg.placeholder}
            value={note}
            onChange={e => setNote(e.target.value)}
            autoFocus
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
        <div className="modal-actions" style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-sm"
            style={cfg.btnStyle}
            onClick={handleConfirm}
            disabled={loading || (cfg.requireNote && !note.trim())}
          >
            {loading ? 'Submitting…' : cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useSelector(s => s.auth);
  const [searchParams] = useSearchParams();
  const [analytics, setAnalytics] = useState(null);
  const [pendingStories, setPendingStories] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [loadingAction, setLoadingAction] = useState(null);
  const [reviewModal, setReviewModal] = useState(null); // { story, type }

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api.get('/admin/analytics').then(r => setAnalytics(r.data.data)).catch(() => {});
    api.get('/stories', { params: { status: 'pending', limit: 20 } }).then(r => setPendingStories(r.data.data)).catch(() => {});
    api.get('/admin/users', { params: { limit: 20 } }).then(r => setUsers(r.data.data)).catch(() => {});
    api.get('/admin/reports').then(r => setReports(r.data.data)).catch(() => {});
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '10rem 0', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  const reviewStory = async (id, status, note = '') => {
    setLoadingAction(id);
    try {
      await api.patch(`/stories/${id}/review`, { status, adminNote: note });
      setPendingStories(prev => prev.filter(s => s._id !== id));
      toast.success(
        status === 'approved' ? 'Story approved!' :
        status === 'rejected' ? 'Story rejected.' :
        'Changes requested — contributor notified.'
      );
    } catch { toast.error('Action failed.'); }
    setLoadingAction(null);
  };

  const toggleBlock = async (userId, isBlocked) => {
    try {
      await api.patch(`/admin/users/${userId}/block`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBlocked: !isBlocked } : u));
      toast.success(isBlocked ? 'User unblocked.' : 'User blocked.');
    } catch { toast.error('Action failed.'); }
  };

  const updateRole = async (userId, role) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role } : u));
      toast.success(`Role updated to ${role}.`);
    } catch { toast.error('Action failed.'); }
  };

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'pending', label: `📋 Pending (${pendingStories.length})` },
    { id: 'users', label: '👥 Users' },
    { id: 'reports', label: `⚑ Reports${reports.filter(r => r.status === 'pending').length ? ` (${reports.filter(r => r.status === 'pending').length})` : ''}` },
  ];

  return (
    <div className="admin">
      <div className="admin__header">
        <div className="container">
          <h1>Admin Dashboard</h1>
          <p>GathaLok Platform Management</p>
        </div>
      </div>

      <div className="container">
        {/* Tabs */}
        <div className="admin__tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`admin__tab ${activeTab === t.id ? 'admin__tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && analytics && (
          <div className="admin__overview">
            <div className="admin__stats-grid">
              {[
                { label: 'Total Users', value: analytics.totalUsers?.toLocaleString(), icon: '👥' },
                { label: 'Total Stories', value: analytics.totalStories?.toLocaleString(), icon: '📜' },
                { label: 'Published', value: analytics.totalApproved?.toLocaleString(), icon: '✅' },
                { label: 'Pending Review', value: analytics.totalPending?.toLocaleString(), icon: '⏳' },
                { label: 'Total Views', value: analytics.totalViews?.toLocaleString(), icon: '👁' },
                { label: 'Top Country', value: analytics.topCountry || '—', icon: '📍' },
                { label: 'Top Category', value: analytics.topCategory || '—', icon: '🏷' },
              ].map((stat, i) => (
                <div key={i} className="admin__stat-card">
                  <span className="admin__stat-icon">{stat.icon}</span>
                  <p className="admin__stat-value">{stat.value || '—'}</p>
                  <p className="admin__stat-label">{stat.label}</p>
                </div>
              ))}
            </div>

            {analytics.topStory && (
              <div className="admin__top-story">
                <h3>Most Viewed Story</h3>
                <Link to={`/stories/${analytics.topStory.slug}`} className="admin__top-story-link">
                  <span>{analytics.topStory.title}</span>
                  <span className="admin__top-story-views">👁 {analytics.topStory.views?.toLocaleString()} views</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Pending Stories */}
        {activeTab === 'pending' && (
          <div className="admin__pending">
            {pendingStories.length === 0 ? (
              <div className="empty-state">
                <div className="icon">✅</div>
                <h3>All caught up!</h3>
                <p>No stories pending review.</p>
              </div>
            ) : (
              pendingStories.map(story => (
                <div key={story._id} className="admin__story-card">
                  <div className="admin__story-info">
                    <div className="admin__story-meta">
                      <span className="badge badge-saffron">⏳ Pending</span>
                      <span className="admin__story-state">📍 {story.country}</span>
                      <span className="admin__story-date">
                        {new Date(story.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <h3 className="admin__story-title">{story.title}</h3>
                    <p className="admin__story-excerpt">{story.shortDescription?.slice(0, 200)}…</p>
                    <p className="admin__story-contributor">
                      Submitted by: <strong>{story.contributor?.name || 'Unknown'}</strong>
                    </p>
                  </div>

                  <div className="admin__story-actions">
                    <Link to={`/stories/${story.slug}`} className="btn btn-ghost btn-sm" target="_blank">
                      Preview
                    </Link>
                    <button
                      className="btn btn-sm"
                      style={{ background: '#1a5c1a', color: '#7edb7e' }}
                      onClick={() => reviewStory(story._id, 'approved')}
                      disabled={loadingAction === story._id}
                    >
                      ✅ Approve
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(139,26,26,0.3)', color: '#e87070' }}
                      onClick={() => setReviewModal({ story, type: 'rejected' })}
                      disabled={loadingAction === story._id}
                    >
                      ❌ Reject
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setReviewModal({ story, type: 'changes_requested' })}
                      disabled={loadingAction === story._id}
                    >
                      ✏️ Request Changes
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="admin__users">
            <div className="admin__users-table">
              <div className="admin__table-head">
                <span>User</span>
                <span>Role</span>
                <span>Stories</span>
                <span>Joined</span>
                <span>Actions</span>
              </div>
              {users.map(u => (
                <div key={u._id} className={`admin__table-row ${u.isBlocked ? 'admin__table-row--blocked' : ''}`}>
                  <div className="admin__user-info">
                    <div className="admin__user-avatar">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="admin__user-name">{u.name}</p>
                      <p className="admin__user-email">{u.email}</p>
                    </div>
                  </div>
                  <span>
                    <select
                      className="admin__role-select"
                      value={u.role}
                      onChange={e => updateRole(u._id, e.target.value)}
                      disabled={u.role === 'admin'}
                    >
                      <option value="user">User</option>
                      <option value="contributor">Contributor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </span>
                  <span className="admin__user-stories">{u.storiesWritten || 0}</span>
                  <span className="admin__user-date">
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                  <div className="admin__user-actions">
                    <button
                      className={`btn btn-sm ${u.isBlocked ? 'btn-ghost' : ''}`}
                      style={!u.isBlocked ? { background: 'rgba(139,26,26,0.2)', color: '#e87070' } : {}}
                      onClick={() => toggleBlock(u._id, u.isBlocked)}
                      disabled={u.role === 'admin'}
                    >
                      {u.isBlocked ? '🔓 Unblock' : '🔒 Block'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports */}
        {activeTab === 'reports' && (
          <div className="admin__reports">
            <h2 className="admin__section-title">Reported Content</h2>
            {reports.length === 0 ? (
              <div className="empty-state" style={{ padding: '4rem 0' }}>
                <div className="icon">✅</div>
                <h3>No pending reports</h3>
                <p>All reports have been reviewed.</p>
              </div>
            ) : (
              <div className="admin__report-list">
                {reports.map(r => (
                  <div key={r._id} className="admin__report-item">
                    <div className="admin__report-meta">
                      <span className={`admin__report-type admin__report-type--${r.targetType}`}>
                        {r.targetType === 'story' ? '📖 Story' : r.targetType === 'comment' ? '💬 Comment' : '👤 User'}
                      </span>
                      <span className="admin__report-reason">{r.reason}</span>
                      <span className="admin__report-date">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="admin__report-reporter">
                      Reported by: <strong>{r.reporter?.name || 'Unknown'}</strong>
                      {r.description && <span className="admin__report-desc"> — "{r.description}"</span>}
                    </div>
                    <div className="admin__report-actions">
                      {r.targetType === 'story' && (
                        <Link to={`/stories/${r.targetId?.slug || r.targetId}`} className="btn btn-ghost btn-sm" target="_blank">
                          View Content ↗
                        </Link>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(139,26,26,0.2)', color: '#e87070' }}
                        onClick={async () => {
                          await api.patch(`/admin/reports/${r._id}`, { status: 'reviewed' });
                          setReports(prev => prev.filter(x => x._id !== r._id));
                          toast.success('Marked as reviewed.');
                        }}
                      >✓ Mark Reviewed</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          await api.patch(`/admin/reports/${r._id}`, { status: 'dismissed' });
                          setReports(prev => prev.filter(x => x._id !== r._id));
                          toast('Report dismissed.');
                        }}
                      >Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal — Reject / Request Changes */}
      {reviewModal && (
        <ReviewModal
          story={reviewModal.story}
          type={reviewModal.type}
          onConfirm={reviewStory}
          onClose={() => setReviewModal(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
