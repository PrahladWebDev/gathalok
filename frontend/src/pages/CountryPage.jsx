import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import StoryCard from '../components/story/StoryCard';
import './CountryPage.css';

const CountryPage = () => {
  const { countryName } = useParams();
  const name = decodeURIComponent(countryName);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/countries/${encodeURIComponent(name)}`).then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, [name]);

  if (loading) return (
    <div style={{ paddingTop: '80px' }}>
      <div className="loading-screen"><div className="spinner" /><p>Loading {name}…</p></div>
    </div>
  );

  if (!data) return (
    <div style={{ paddingTop: '80px' }}>
      <div className="container">
        <div className="empty-state" style={{ padding: '8rem 0' }}>
          <div className="icon">🗺</div>
          <h3>Country not found</h3>
          <Link to="/map" className="btn btn-gold" style={{ margin: '1rem auto 0' }}>Back to Map</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="state-page">
      <div className="state-page__hero">
        <div className="container">
          <nav className="state-page__breadcrumb">
            <Link to="/">Home</Link> / <Link to="/map">World Map</Link> / <span>{name}</span>
          </nav>
          <h1 className="state-page__title">{name}</h1>
          <div className="state-page__stats">
            <div className="state-page__stat">
              <span>{data.storyCount}</span>
              <span>Stories</span>
            </div>
            <div className="state-page__stat">
              <span>{data.contributors?.length || 0}</span>
              <span>Contributors</span>
            </div>
          </div>
          <div className="state-page__actions">
            <Link to={`/explore?country=${encodeURIComponent(name)}`} className="btn btn-gold">Browse All Stories</Link>
            <Link to="/map" className="btn btn-ghost">← Back to Map</Link>
          </div>
        </div>
      </div>

      <div className="container">
        {data.featured && (
          <section className="section">
            <div className="section-header">
              <div><p className="section-eyebrow">Most Notable</p><h2>Featured Legend</h2></div>
            </div>
            <StoryCard story={data.featured} size="large" />
          </section>
        )}

        {data.stories?.length > 0 && (
          <section className="section">
            <div className="section-header">
              <div><p className="section-eyebrow">All Tales</p><h2>Stories from {name}</h2></div>
              <Link to={`/explore?country=${encodeURIComponent(name)}`} className="btn btn-ghost btn-sm">View All →</Link>
            </div>
            <div className="grid-3">
              {data.stories.filter(s => !data.featured || s._id !== data.featured._id).slice(0, 6).map(s => (
                <StoryCard key={s._id} story={s} />
              ))}
            </div>
          </section>
        )}

        {data.contributors?.length > 0 && (
          <section className="section">
            <h2>Top Contributors</h2>
            <div className="state-page__contributors">
              {data.contributors.map(u => (
                <div key={u._id} className="state-page__contributor">
                  <div className="state-page__contrib-avatar">
                    {u.avatar?.url
                      ? <img src={u.avatar.url} alt={u.name} />
                      : <div className="state-page__contrib-fallback">{u.name?.[0]}</div>
                    }
                  </div>
                  <div>
                    <p className="state-page__contrib-name">{u.name}</p>
                    <p className="state-page__contrib-count">{u.storiesWritten} stories</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default CountryPage;
