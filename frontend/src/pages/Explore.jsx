import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import StoryCard from '../components/story/StoryCard';
import api from '../utils/api';
import { COUNTRIES } from '../assets/data/countries';
import { CATEGORIES } from '../assets/data/categories';
import './Explore.css';

const SORTS = [
  { value: '-createdAt',     label: 'Newest' },
  { value: '-views',         label: 'Most Viewed' },
  { value: '-averageRating', label: 'Highest Rated' },
  { value: 'title',          label: 'A–Z' },
];

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stories, setStories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);

  const search   = searchParams.get('search')   || '';
  const country  = searchParams.get('country')  || '';
  const category = searchParams.get('category') || '';
  const sort     = searchParams.get('sort')      || '-createdAt';
  const page     = Number(searchParams.get('page') || 1);

  // Local search input state — debounced before hitting URL/API
  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef(null);

  // Sync local input if URL param changes externally (e.g. clear filters)
  useEffect(() => { setSearchInput(search); }, [search]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam('search', val);
    }, 500);
  };

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, sort };
      if (search) params.search = search;
      if (country) params.country = country;
      if (category) params.category = category;
      const res = await api.get('/stories', { params });
      setStories(res.data.data);
      setPagination(res.data.pagination);
    } catch (_) {
      setStories([]);
    }
    setLoading(false);
  }, [search, country, category, sort, page]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const setPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', p);
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => setSearchParams({});

  const hasFilters = search || country || category || sort !== '-createdAt';

  return (
    <div className="explore">
      {/* Top bar */}
      <div className="explore__topbar">
        <div className="container">
          <h1 className="explore__title">Explore Stories</h1>
          <p className="explore__subtitle">
            {pagination ? `${pagination.total.toLocaleString()} stories from around the world` : 'Searching the archives…'}
          </p>
        </div>
      </div>

      <div className="container">
        <div className="explore__layout">
          {/* Sidebar Filters */}
          <aside className="explore__sidebar">
            <div className="explore__filter-section">
              <div className="explore__filter-header">
                <h3>Filters</h3>
                {hasFilters && (
                  <button className="explore__clear-btn" onClick={clearFilters}>Clear all</button>
                )}
              </div>

              {/* Search */}
              <div className="explore__filter-group">
                <label className="form-label">Search</label>
                <input
                  className="form-input"
                  placeholder="Title, creature, place…"
                  value={searchInput}
                  onChange={handleSearchChange}
                />
              </div>

              {/* Sort */}
              <div className="explore__filter-group">
                <label className="form-label">Sort By</label>
                <select className="form-select" value={sort} onChange={e => updateParam('sort', e.target.value)}>
                  {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Country */}
              <div className="explore__filter-group">
                <label className="form-label">Country</label>
                <select className="form-select" value={country} onChange={e => updateParam('country', e.target.value)}>
                  <option value="">All Countries</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.name}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="explore__filter-group">
                <label className="form-label">Category</label>
                <div className="explore__cat-list">
                  <button
                    className={`explore__cat-btn ${!category ? 'explore__cat-btn--active' : ''}`}
                    onClick={() => updateParam('category', '')}
                  >All</button>
                  {CATEGORIES.map(c => (
                    <button
                      key={c.slug}
                      className={`explore__cat-btn ${category === c.slug ? 'explore__cat-btn--active' : ''}`}
                      onClick={() => updateParam('category', category === c.slug ? '' : c.slug)}
                    >
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <main className="explore__results">
            {/* Active filters */}
            {hasFilters && (
              <div className="explore__active-filters">
                {search   && <span className="explore__filter-chip">🔍 "{search}" <button onClick={() => updateParam('search', '')}>✕</button></span>}
                {country  && <span className="explore__filter-chip">📍 {country} <button onClick={() => updateParam('country', '')}>✕</button></span>}
                {category && <span className="explore__filter-chip">🏷 {CATEGORIES.find(c => c.slug === category)?.name || category} <button onClick={() => updateParam('category', '')}>✕</button></span>}
              </div>
            )}

            {loading ? (
              <div className="loading-screen">
                <div className="spinner" />
                <p>Searching the archives…</p>
              </div>
            ) : stories.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🌑</div>
                <h3>No stories found</h3>
                <p>Try adjusting your filters or search for something else.</p>
                <button className="btn btn-gold" style={{ margin: '1rem auto 0' }} onClick={clearFilters}>Clear Filters</button>
              </div>
            ) : (
              <>
                <div className="explore__grid">
                  {stories.map(s => <StoryCard key={s._id} story={s} />)}
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="explore__pagination">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >← Prev</button>
                    <div className="explore__page-nums">
                      {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                        const p = i + 1;
                        return (
                          <button
                            key={p}
                            className={`explore__page-num ${p === page ? 'explore__page-num--active' : ''}`}
                            onClick={() => setPage(p)}
                          >{p}</button>
                        );
                      })}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.pages}
                    >Next →</button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Explore;
