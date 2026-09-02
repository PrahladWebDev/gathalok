import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getCategory } from '../assets/data/categories';
import './Leaderboard.css';

const Leaderboard = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('readers');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leaderboard').then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const TABS = [
    { id: 'readers',      label: '📚 Top Readers' },
    { id: 'contributors', label: '✍️ Top Contributors' },
    { id: 'stories',      label: '🔥 Most Popular Stories' },
  ];

  if (loading) return (
    <div style={{ paddingTop: '80px' }}>
      <div className="loading-screen"><div className="spinner" /><p>Consulting the archives…</p></div>
    </div>
  );

  return (
    <div className="leaderboard">
      <div className="leaderboard__header">
        <div className="container">
          <p className="section-eyebrow">Hall of Fame</p>
          <h1>Leaderboard</h1>
          <p className="leaderboard__subtitle">The most devoted seekers and storytellers of world folklore.</p>
        </div>
      </div>

      <div className="container">
        <div className="leaderboard__tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`leaderboard__tab ${tab === t.id ? 'leaderboard__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {/* Top Readers */}
        {tab === 'readers' && data?.topReaders && (
          <div className="leaderboard__list">
            {data.topReaders.map((u, i) => (
              <div key={u._id} className={`leaderboard__item ${i < 3 ? 'leaderboard__item--podium' : ''}`}>
                <div className={`leaderboard__rank leaderboard__rank--${i + 1}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <div className="leaderboard__avatar">
                  {u.avatar?.url
                    ? <img src={u.avatar.url} alt={u.name} />
                    : <div className="leaderboard__avatar-fallback">{u.name?.[0]}</div>
                  }
                </div>
                <div className="leaderboard__user-info">
                  <p className="leaderboard__user-name">{u.name}</p>
                  <p className="leaderboard__user-handle">@{u.username}</p>
                </div>
                <div className="leaderboard__user-stats">
                  <div className="leaderboard__user-stat">
                    <span>{u.storiesRead || 0}</span>
                    <span>Stories Read</span>
                  </div>
                  <div className="leaderboard__user-stat">
                    <span>{u.countriesExplored?.length || 0}</span>
                    <span>Countries</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Contributors */}
        {tab === 'contributors' && data?.topContributors && (
          <div className="leaderboard__list">
            {data.topContributors.map((u, i) => (
              <div key={u._id} className={`leaderboard__item ${i < 3 ? 'leaderboard__item--podium' : ''}`}>
                <div className={`leaderboard__rank leaderboard__rank--${i + 1}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <div className="leaderboard__avatar">
                  {u.avatar?.url
                    ? <img src={u.avatar.url} alt={u.name} />
                    : <div className="leaderboard__avatar-fallback">{u.name?.[0]}</div>
                  }
                </div>
                <div className="leaderboard__user-info">
                  <p className="leaderboard__user-name">{u.name}</p>
                  <p className="leaderboard__user-handle">@{u.username}</p>
                </div>
                <div className="leaderboard__user-stats">
                  <div className="leaderboard__user-stat">
                    <span>{u.storiesWritten || 0}</span>
                    <span>Published</span>
                  </div>
                  <div className="leaderboard__user-stat">
                    <span>{u.totalLikesReceived || 0}</span>
                    <span>Likes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Most Popular Stories */}
        {tab === 'stories' && data?.topStories && (
          <div className="leaderboard__stories-list">
            {data.topStories.map((story, i) => (
              <Link key={story._id} to={`/stories/${story.slug}`} className="leaderboard__story-item">
                <div className={`leaderboard__rank leaderboard__rank--${i + 1}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <div
                  className="leaderboard__story-img"
                  style={{
                    backgroundImage: story.coverImage?.url ? `url(${story.coverImage.url})` : undefined,
                    backgroundColor: 'var(--surface)',
                  }}
                />
                <div className="leaderboard__story-info">
                  <p className="leaderboard__story-cat">{getCategory(story.category)?.icon} {getCategory(story.category)?.name}</p>
                  <h3 className="leaderboard__story-title">{story.title}</h3>
                  <p className="leaderboard__story-state">📍 {story.country}</p>
                </div>
                <div className="leaderboard__story-stats">
                  <div className="leaderboard__user-stat">
                    <span>👁 {story.views?.toLocaleString() || 0}</span>
                    <span>Views</span>
                  </div>
                  <div className="leaderboard__user-stat">
                    <span>★ {story.averageRating?.toFixed(1) || '—'}</span>
                    <span>Rating</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
