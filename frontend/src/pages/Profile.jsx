import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import { getMe } from '../store/slices/authSlice';
import { openAuthModal } from '../store/slices/uiSlice';
import api from '../utils/api';
import StoryCard from '../components/story/StoryCard';
import { getCategory } from '../assets/data/categories';
import './Profile.css';

const TABS = [
  { id: 'overview',    label: '👤 Overview' },
  { id: 'bookmarks',   label: '🔖 Bookmarks' },
  { id: 'history',     label: '📜 History' },
  { id: 'contributions', label: '✍️ Contributions' },
  { id: 'achievements', label: '🏆 Achievements' },
];

const Profile = ({ initialTab = 'overview' }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const [tab, setTab] = useState(initialTab);
  const [activeCollection, setActiveCollection] = useState('All Bookmarks');
  const [collections, setCollections] = useState(['All Bookmarks']);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [moveModal, setMoveModal] = useState(null); // { storyId }
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) dispatch(getMe()); }, [dispatch]);

  useEffect(() => {
    if (!user) return;
    if (tab === 'bookmarks') {
      setLoading(true);
      api.get('/bookmarks').then(r => {
        setBookmarks(r.data.data);
        setCollections(r.data.collections || ['All Bookmarks']);
      }).catch(() => {}).finally(() => setLoading(false));
    }
    if (tab === 'history' && !history.length) {
      setLoading(true);
      api.get('/users/reading-history').then(r => setHistory(r.data.data)).catch(() => {}).finally(() => setLoading(false));
    }
    if (tab === 'contributions' && !contributions.length) {
      setLoading(true);
      api.get('/stories', { params: { contributor: user._id, status: 'all', limit: 20 } })
        .then(r => setContributions(r.data.data)).catch(() => {}).finally(() => setLoading(false));
    }
    if (tab === 'achievements' && !allAchievements.length) {
      api.get('/achievements').then(r => setAllAchievements(r.data.data)).catch(() => {});
    }
  }, [tab, user]);

  if (!user) return <Navigate to="/" />;

  const unlockedIds = new Set(user.achievements?.map(a => a.achievementId?._id || a.achievementId));

  const createCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    try {
      await api.post('/bookmarks/collections', { name });
      if (!collections.includes(name)) setCollections(prev => [...prev, name]);
      setActiveCollection(name);
    } catch {
      // even if the create call fails (e.g. dup), still let the user try using it
      if (!collections.includes(name)) setCollections(prev => [...prev, name]);
      setActiveCollection(name);
    } finally {
      setNewCollectionName('');
      setShowNewCollection(false);
    }
  };

  const moveBookmark = async (storyId, collection) => {
    try {
      await api.patch(`/bookmarks/${storyId}/move`, { collection });
      setBookmarks(prev => prev.map(b => b.story?._id === storyId ? { ...b, collection } : b));
      if (!collections.includes(collection)) setCollections(prev => [...prev, collection]);
      setMoveModal(null);
    } catch { }
  };

  // Removes a bookmark entirely (used from the "All Bookmarks" view)
  const removeBookmark = async (storyId) => {
    try {
      await api.post(`/bookmarks/${storyId}`);
      setBookmarks(prev => prev.filter(b => b.story?._id !== storyId));
    } catch {}
  };

  // Takes a story out of the current collection without deleting the bookmark
  // (moves it back to "All Bookmarks")
  const removeFromCollection = async (storyId) => {
    if (activeCollection === 'All Bookmarks') {
      await removeBookmark(storyId);
    } else {
      await moveBookmark(storyId, 'All Bookmarks');
    }
  };

  const statusColor = { approved: '#7edb7e', pending: '#e8c97a', rejected: '#e87070', draft: '#7a7090', changes_requested: '#e8923a' };
  const statusLabel = { approved: '✅ Published', pending: '⏳ Pending', rejected: '❌ Rejected', draft: '📝 Draft', changes_requested: '✏️ Changes Needed' };

  return (
    <div className="profile">
      {/* Profile Hero */}
      <div className="profile__hero">
        <div className="container">
          <div className="profile__hero-inner">
            <div className="profile__avatar">
              {user.avatar?.url
                ? <img src={user.avatar.url} alt={user.name} />
                : <div className="profile__avatar-fallback">{user.name[0].toUpperCase()}</div>
              }
            </div>
            <div className="profile__info">
              <div className="profile__name-row">
                <h1 className="profile__name">{user.name}</h1>
                <span className="badge badge-gold">{user.role}</span>
              </div>
              <p className="profile__username">@{user.username}</p>
              {user.bio && <p className="profile__bio">{user.bio}</p>}
              <div className="profile__stats">
                <div className="profile__stat">
                  <span className="profile__stat-num">{user.storiesRead || 0}</span>
                  <span className="profile__stat-label">Stories Read</span>
                </div>
                <div className="profile__stat">
                  <span className="profile__stat-num">{user.storiesWritten || 0}</span>
                  <span className="profile__stat-label">Published</span>
                </div>
                <div className="profile__stat">
                  <span className="profile__stat-num">{user.countriesExplored?.length || 0}</span>
                  <span className="profile__stat-label">Countries</span>
                </div>
                <div className="profile__stat">
                  <span className="profile__stat-num">{user.achievements?.length || 0}</span>
                  <span className="profile__stat-label">Achievements</span>
                </div>
              </div>
            </div>
            <div className="profile__actions">
              <Link to="/settings" className="btn btn-ghost btn-sm">Edit Profile</Link>
              {(user.role === 'contributor' || user.role === 'admin') && (
                <Link to="/contribute" className="btn btn-gold btn-sm">+ New Story</Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Countries Explored progress */}
      <div className="profile__state-progress">
        <div className="container">
          <div className="profile__state-bar-wrap">
            <span className="profile__state-label">World Explored</span>
            <div className="profile__state-bar">
              <div
                className="profile__state-fill"
                style={{ width: `${Math.min(100, ((user.countriesExplored?.length || 0) / 20) * 100)}%` }}
              />
            </div>
            <span className="profile__state-count">{user.countriesExplored?.length || 0} / 20 countries</span>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Tabs */}
        <div className="profile__tabs">
          {TABS.filter(t => t.id !== 'contributions' || user.role !== 'user').map(t => (
            <button
              key={t.id}
              className={`profile__tab ${tab === t.id ? 'profile__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {/* ── Overview ─────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="profile__overview">
            <div className="profile__overview-grid">
              <div className="profile__overview-card">
                <h3>Reading Journey</h3>
                <div className="profile__overview-stats">
                  <div><strong>{user.storiesRead}</strong><span>Stories read</span></div>
                  <div><strong>{user.countriesExplored?.length || 0}</strong><span>Countries explored</span></div>
                  <div><strong>{user.likesReceived || 0}</strong><span>Likes received</span></div>
                </div>
              </div>
              <div className="profile__overview-card">
                <h3>Countries Visited</h3>
                {user.countriesExplored?.length > 0 ? (
                  <div className="profile__states-wrap">
                    {user.countriesExplored.map(c => (
                      <Link key={c} to={`/countries/${encodeURIComponent(c)}`} className="profile__state-chip">{c}</Link>
                    ))}
                  </div>
                ) : (
                  <p className="profile__empty-hint">Start reading to explore countries!</p>
                )}
              </div>
            </div>

            {/* Recent achievements */}
            {user.achievements?.length > 0 && (
              <div className="profile__recent-achievements">
                <h3>Recent Achievements</h3>
                <div className="profile__achievement-row">
                  {user.achievements.slice(-4).map((a, i) => (
                    <div key={i} className="profile__achievement-badge">
                      <span className="profile__achievement-icon">{a.achievementId?.icon || '🏆'}</span>
                      <span className="profile__achievement-title">{a.achievementId?.title || 'Achievement'}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }} onClick={() => setTab('achievements')}>
                  View All Achievements →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Bookmarks ─────────────────────────────────── */}
        {tab === 'bookmarks' && (
          <div>
            {/* Collections Bar */}
            <div className="profile__collections-bar">
              <div className="profile__collections-list">
                {collections.map(col => (
                  <button
                    key={col}
                    className={`profile__collection-chip ${activeCollection === col ? 'profile__collection-chip--active' : ''}`}
                    onClick={() => setActiveCollection(col)}
                  >
                    {col === 'All Bookmarks' ? '🔖 ' : '📁 '}{col}
                    <span className="profile__collection-count">
                      {col === 'All Bookmarks'
                        ? bookmarks.length
                        : bookmarks.filter(b => (b.collection || 'All Bookmarks') === col).length}
                    </span>
                  </button>
                ))}
                {!showNewCollection ? (
                  <button className="profile__collection-add" onClick={() => setShowNewCollection(true)}>+ New Collection</button>
                ) : (
                  <div className="profile__collection-create">
                    <input
                      className="form-input profile__collection-input"
                      value={newCollectionName}
                      onChange={e => setNewCollectionName(e.target.value)}
                      placeholder="Collection name"
                      onKeyDown={e => e.key === 'Enter' && createCollection()}
                      autoFocus
                    />
                    <button className="btn btn-gold btn-sm" onClick={createCollection}>Create</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowNewCollection(false)}>×</button>
                  </div>
                )}
              </div>
            </div>

            {loading ? <div className="spinner" /> : (() => {
              const filtered = activeCollection === 'All Bookmarks'
                ? bookmarks
                : bookmarks.filter(b => (b.collection || 'All Bookmarks') === activeCollection);
              return filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🔖</div>
                  <h3>{activeCollection === 'All Bookmarks' ? 'No bookmarks yet' : 'Collection is empty'}</h3>
                  <p>{activeCollection === 'All Bookmarks' ? 'Stories you bookmark will appear here.' : 'Move bookmarks here from other collections.'}</p>
                  {activeCollection === 'All Bookmarks' && (
                    <Link to="/explore" className="btn btn-gold" style={{ margin: '1rem auto 0' }}>Explore Stories</Link>
                  )}
                </div>
              ) : (
                <div className="profile__bookmarks-grid">
                  {filtered.map(b => b.story && (
                    <div key={b._id} className="profile__bookmark-item">
                      <StoryCard story={b.story} />
                      <div className="profile__bookmark-actions">
                        <button
                          className="profile__bookmark-move"
                          onClick={() => setMoveModal({ storyId: b.story._id })}
                          title="Move to collection"
                        >📁 Move</button>
                        <button
                          className="profile__bookmark-remove"
                          onClick={() => removeFromCollection(b.story._id)}
                          title={activeCollection === 'All Bookmarks' ? 'Remove bookmark' : 'Remove from collection'}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Move to Collection Modal */}
            {moveModal && (
              <div className="modal-overlay" onClick={() => setMoveModal(null)}>
                <div className="modal-box" onClick={e => e.stopPropagation()}>
                  <h3 className="modal-title">Move to Collection</h3>
                  <div className="profile__move-list">
                    {collections.map(col => (
                      <button
                        key={col}
                        className="profile__move-option"
                        onClick={() => moveBookmark(moveModal.storyId, col)}
                      >
                        {col === 'All Bookmarks' ? '🔖' : '📁'} {col}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="form-input"
                      placeholder="New collection name…"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          moveBookmark(moveModal.storyId, e.target.value.trim());
                        }
                      }}
                    />
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setMoveModal(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── History ───────────────────────────────────── */}
        {tab === 'history' && (
          <div>
            {loading ? <div className="spinner" /> :
              history.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📜</div>
                  <h3>No reading history</h3>
                  <p>Stories you've read will appear here.</p>
                </div>
              ) : (
                <div className="profile__history-list">
                  {history.map(h => h.story && (
                    <Link key={h._id} to={`/stories/${h.story.slug}`} className="profile__history-item">
                      <div
                        className="profile__history-img"
                        style={{
                          backgroundImage: h.story.coverImage?.url ? `url(${h.story.coverImage.url})` : undefined,
                          backgroundColor: 'var(--surface)',
                        }}
                      />
                      <div className="profile__history-info">
                        <p className="profile__history-cat">{getCategory(h.story.category)?.icon} {getCategory(h.story.category)?.name}</p>
                        <h4 className="profile__history-title">{h.story.title}</h4>
                        <p className="profile__history-meta">
                          📍 {h.story.country} ·
                          Read {new Date(h.readAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ·
                          {h.timeSpent > 0 ? ` ${Math.round(h.timeSpent / 60)} min` : ''}
                        </p>
                      </div>
                      <div className="profile__history-arrow">→</div>
                    </Link>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── Contributions ─────────────────────────────── */}
        {tab === 'contributions' && (
          <div>
            <div className="profile__contributions-header">
              <h3>{contributions.length} Submitted Stories</h3>
              <Link to="/contribute" className="btn btn-gold btn-sm">+ New Story</Link>
            </div>
            {loading ? <div className="spinner" /> :
              contributions.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">✍️</div>
                  <h3>No submissions yet</h3>
                  <p>Share your first legend with the world!</p>
                  <Link to="/contribute" className="btn btn-gold" style={{ margin: '1rem auto 0' }}>Submit a Story</Link>
                </div>
              ) : (
                <div className="profile__contrib-list">
                  {contributions.map(s => (
                    <div key={s._id} className="profile__contrib-card">
                      <div className="profile__contrib-info">
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <span
                            className="badge"
                            style={{
                              background: `${statusColor[s.status]}20`,
                              color: statusColor[s.status],
                              border: `1px solid ${statusColor[s.status]}40`,
                            }}
                          >
                            {statusLabel[s.status] || s.status}
                          </span>
                          {s.category && <span className="badge badge-gold">{getCategory(s.category)?.icon} {getCategory(s.category)?.name}</span>}
                        </div>
                        <h3 className="profile__contrib-title">{s.title}</h3>
                        <p className="profile__contrib-meta">
                          📍 {s.country} · {new Date(s.createdAt).toLocaleDateString('en-IN')}
                          {s.averageRating > 0 && ` · ★ ${s.averageRating.toFixed(1)}`}
                          {s.views > 0 && ` · 👁 ${s.views.toLocaleString()}`}
                        </p>
                        {s.adminNote && (
                          <p className="profile__contrib-note">Admin note: {s.adminNote}</p>
                        )}
                      </div>
                      <div className="profile__contrib-actions">
                        {s.status !== 'approved' && (
                          <Link to={`/contribute/edit/${s._id}`} className="btn btn-ghost btn-sm">Edit</Link>
                        )}
                        {s.status === 'approved' && (
                          <Link to={`/stories/${s.slug}`} className="btn btn-ghost btn-sm">View</Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── Achievements ──────────────────────────────── */}
        {tab === 'achievements' && (
          <div className="profile__achievements">
            <p className="profile__achievements-summary">
              {user.achievements?.length || 0} of {allAchievements.length} achievements unlocked
            </p>
            <div className="profile__achievements-grid">
              {allAchievements.map(ach => {
                const unlocked = unlockedIds.has(ach._id);
                return (
                  <div key={ach._id} className={`profile__achievement ${unlocked ? 'profile__achievement--unlocked' : 'profile__achievement--locked'}`}>
                    <span className="profile__achievement-big-icon">{ach.icon}</span>
                    <h4 className="profile__achievement-name">{ach.title}</h4>
                    <p className="profile__achievement-desc">{ach.description}</p>
                    <div className="profile__achievement-xp">+{ach.xpValue} XP</div>
                    {!unlocked && <div className="profile__achievement-lock">🔒</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;