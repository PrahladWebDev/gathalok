import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';
import StoryCard from '../components/story/StoryCard';
import FollowButton from '../components/user/FollowButton';
import './PublicProfile.css';

const Avatar = ({ user, className }) => (
  <div className={className}>
    {user.avatar?.url
      ? <img src={user.avatar.url} alt={user.name} />
      : <div className={`${className}-fallback`}>{user.name?.[0]?.toUpperCase()}</div>}
  </div>
);

const UserRow = ({ u, onToggle }) => {
  // Only contributors/admins have public profiles and can be followed
  const hasProfile = u.role === 'contributor' || u.role === 'admin';
  const body = (
    <>
      <Avatar user={u} className="pub-user__avatar" />
      <div className="pub-user__info">
        <p className="pub-user__name">
          {u.name}
          {u.role === 'contributor' && <span className="pub-badge">Contributor</span>}
          {u.role === 'admin' && <span className="pub-badge">Admin</span>}
        </p>
        <p className="pub-user__handle">@{u.username}</p>
        {u.bio && <p className="pub-user__bio">{u.bio}</p>}
      </div>
    </>
  );
  return (
    <div className="pub-user">
      {hasProfile
        ? <Link to={`/u/${u.username}`} className="pub-user__link">{body}</Link>
        : <div className="pub-user__link">{body}</div>}
      {hasProfile && !u.isSelf && (
        <FollowButton userId={u._id} initialFollowing={u.isFollowing} onChange={(f) => onToggle(u._id, f)} />
      )}
    </div>
  );
};

const PublicProfileInner = ({ username }) => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('stories');

  // Per-tab data
  const [lists, setLists] = useState({
    stories:   { items: [], page: 0, pages: 1, loading: false },
    followers: { items: [], page: 0, pages: 1, loading: false },
    following: { items: [], page: 0, pages: 1, loading: false },
  });

  const loadProfile = useCallback(() => {
    setLoading(true); setError(false);
    api.get(`/users/${username}`)
      .then(r => setProfile(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    loadProfile();
    window.scrollTo(0, 0);
  }, [loadProfile]);

  const loadMore = useCallback(async (which) => {
    setLists(prev => ({ ...prev, [which]: { ...prev[which], loading: true } }));
    try {
      const next = (lists[which].page || 0) + 1;
      const res = await api.get(`/users/${username}/${which}`, { params: { page: next, limit: which === 'stories' ? 12 : 20 } });
      setLists(prev => ({
        ...prev,
        [which]: {
          items: [...prev[which].items, ...res.data.data],
          page: res.data.pagination.page,
          pages: res.data.pagination.pages,
          loading: false,
        },
      }));
    } catch {
      setLists(prev => ({ ...prev, [which]: { ...prev[which], loading: false } }));
    }
  }, [lists, username]);

  // Lazy-load a tab the first time it's opened
  useEffect(() => {
    if (!profile) return;
    const l = lists[tab];
    if (l.page === 0 && !l.loading) loadMore(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, profile]);

  const handleProfileFollow = (isFollowing, followersCount) => {
    setProfile(p => ({ ...p, isFollowing, followersCount: followersCount ?? p.followersCount + (isFollowing ? 1 : -1) }));
    // followers list is now stale
    setLists(prev => ({ ...prev, followers: { items: [], page: 0, pages: 1, loading: false } }));
  };

  const handleRowToggle = (id, isFollowing) => {
    setLists(prev => {
      const patch = (arr) => arr.map(u => u._id === id ? { ...u, isFollowing } : u);
      return {
        ...prev,
        followers: { ...prev.followers, items: patch(prev.followers.items) },
        following: { ...prev.following, items: patch(prev.following.items) },
      };
    });
    // If I'm looking at my own profile, my "following" count changes
    if (profile?.isSelf) setProfile(p => ({ ...p, followingCount: Math.max(0, p.followingCount + (isFollowing ? 1 : -1)) }));
  };

  if (loading) return (
    <div style={{ paddingTop: '80px' }}>
      <div className="loading-screen"><div className="spinner" /><p>Summoning storyteller…</p></div>
    </div>
  );

  if (error || !profile) return (
    <div style={{ paddingTop: '80px' }}>
      <div className="container">
        <div className="empty-state" style={{ padding: '10rem 0' }}>
          <div className="icon">🌑</div>
          <h3>Profile not found</h3>
          <p>This storyteller doesn't exist or is no longer active.</p>
          <Link to="/leaderboard" className="btn btn-gold" style={{ margin: '1.5rem auto 0', display: 'inline-flex' }}>Browse Leaderboard</Link>
        </div>
      </div>
    </div>
  );

  const isContributor = profile.role === 'contributor' || profile.role === 'admin';
  const joined = new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const TABS = [
    { id: 'stories',   label: `Stories (${profile.publishedCount})` },
    { id: 'followers', label: `Followers (${profile.followersCount})` },
    { id: 'following', label: `Following (${profile.followingCount})` },
  ];

  const cur = lists[tab];

  return (
    <div className="pub-profile">
      <div className="pub-profile__hero">
        <div className="container pub-profile__hero-inner">
          <Avatar user={profile} className="pub-profile__avatar" />
          <div className="pub-profile__info">
            <div className="pub-profile__name-row">
              <h1 className="pub-profile__name">{profile.name}</h1>
              {isContributor && <span className="pub-badge">{profile.role === 'admin' ? 'Admin' : 'Contributor'}</span>}
            </div>
            <p className="pub-profile__handle">@{profile.username}</p>
            {profile.bio && <p className="pub-profile__bio">{profile.bio}</p>}
            <p className="pub-profile__meta">
              {profile.country && <>📍 {profile.country} · </>}Joined {joined}
            </p>
            <div className="pub-profile__stats">
              <button className="pub-stat" onClick={() => setTab('stories')}>
                <span className="pub-stat__num">{profile.publishedCount}</span><span className="pub-stat__label">Stories</span>
              </button>
              <button className="pub-stat" onClick={() => setTab('followers')}>
                <span className="pub-stat__num">{profile.followersCount}</span><span className="pub-stat__label">Followers</span>
              </button>
              <button className="pub-stat" onClick={() => setTab('following')}>
                <span className="pub-stat__num">{profile.followingCount}</span><span className="pub-stat__label">Following</span>
              </button>
              <div className="pub-stat pub-stat--static">
                <span className="pub-stat__num">{profile.likesReceived}</span><span className="pub-stat__label">Likes</span>
              </div>
            </div>
          </div>
          <div className="pub-profile__actions">
            {profile.isSelf
              ? <Link to="/profile" className="btn btn-ghost btn-sm">Go to my dashboard</Link>
              : <FollowButton userId={profile._id} initialFollowing={profile.isFollowing} size="md" onChange={handleProfileFollow} />}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="pub-profile__tabs">
          {TABS.map(t => (
            <button key={t.id} className={`pub-profile__tab ${tab === t.id ? 'pub-profile__tab--active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'stories' && (
          cur.items.length === 0 && !cur.loading ? (
            <div className="empty-state"><div className="icon">📜</div><h3>No published stories yet</h3></div>
          ) : (
            <div className="grid-3">{cur.items.map(s => <StoryCard key={s._id} story={s} />)}</div>
          )
        )}

        {tab !== 'stories' && (
          cur.items.length === 0 && !cur.loading ? (
            <div className="empty-state">
              <div className="icon">👥</div>
              <h3>{tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</h3>
            </div>
          ) : (
            <div className="pub-users">
              {cur.items.map(u => <UserRow key={u._id} u={u} onToggle={handleRowToggle} />)}
            </div>
          )
        )}

        {cur.loading && <div className="loading-screen" style={{ minHeight: 120 }}><div className="spinner" /></div>}

        {!cur.loading && cur.page > 0 && cur.page < cur.pages && (
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            <button className="btn btn-ghost" onClick={() => loadMore(tab)}>Load more</button>
          </div>
        )}
      </div>
    </div>
  );
};

// Keyed by username so navigating between profiles fully resets state
const PublicProfile = () => {
  const { username } = useParams();
  return <PublicProfileInner key={username} username={username} />;
};

export default PublicProfile;
