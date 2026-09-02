import React, { useEffect, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './Notifications.css';

const TYPE_ICONS = {
  story_approved: '✅',
  story_rejected: '❌',
  story_changes:  '✏️',
  comment:        '💬',
  reply:          '↩️',
  like:           '♥',
  achievement:    '🏆',
  feature:        '⭐',
  announcement:   '📢',
};

const NotificationItem = ({ notif, onRead }) => {
  const isUnread = !notif.isRead;
  const icon = TYPE_ICONS[notif.type] || '🔔';

  const handleClick = () => {
    if (isUnread) onRead([notif._id]);
  };

  const inner = (
    <div className={`notif__item ${isUnread ? 'notif__item--unread' : ''}`} onClick={handleClick}>
      <div className="notif__icon-wrap">
        <span className="notif__type-icon">{icon}</span>
        {notif.sender?.avatar?.url ? (
          <img className="notif__sender-avatar" src={notif.sender.avatar.url} alt={notif.sender.name} />
        ) : notif.sender ? (
          <div className="notif__sender-fallback">{notif.sender.name?.[0]?.toUpperCase()}</div>
        ) : null}
      </div>
      <div className="notif__body">
        <p className="notif__title">{notif.title}</p>
        <p className="notif__message">{notif.message}</p>
        <span className="notif__time">
          {new Date(notif.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </div>
      {isUnread && <div className="notif__dot" />}
    </div>
  );

  return notif.link ? <Link to={notif.link} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
};

const Notifications = () => {
  const { user } = useSelector(s => s.auth);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === 'unread' ? { unreadOnly: true } : {};
      const res = await api.get('/notifications', { params });
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch { toast.error('Failed to load notifications.'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  if (!user) return <Navigate to="/" />;

  const markRead = async (ids) => {
    try {
      await api.patch('/notifications/read', { ids });
      setNotifications(prev =>
        prev.map(n => ids === 'all' || ids.includes(n._id) ? { ...n, isRead: true } : n)
      );
      setUnreadCount(0);
    } catch {}
  };

  const markAllRead = () => markRead('all');

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <div className="notifications-page">
      <div className="notif__header">
        <div className="container">
          <Link to="/profile" className="notif__back">← Back to Profile</Link>
          <div className="notif__header-row">
            <div>
              <h1 className="notif__title-h1">Notifications</h1>
              {unreadCount > 0 && (
                <p className="notif__subtitle">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                ✓ Mark all as read
              </button>
            )}
          </div>

          <div className="notif__filters">
            {['all', 'unread'].map(f => (
              <button
                key={f}
                className={`notif__filter-btn ${filter === f ? 'notif__filter-btn--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : `Unread${unreadCount ? ` (${unreadCount})` : ''}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container notif__content">
        {loading ? (
          <div className="notif__loading">
            <div className="spinner" />
            <p>Loading notifications…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '6rem 0' }}>
            <div className="icon">🔔</div>
            <h3>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h3>
            <p>
              {filter === 'unread'
                ? "You're all caught up!"
                : 'You\'ll be notified when your stories get approved, receive comments, or you earn achievements.'}
            </p>
            {filter === 'unread' && (
              <button className="btn btn-ghost" onClick={() => setFilter('all')} style={{ marginTop: '1rem' }}>
                View all notifications
              </button>
            )}
          </div>
        ) : (
          <div className="notif__list">
            {filtered.map(n => (
              <NotificationItem key={n._id} notif={n} onRead={markRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;