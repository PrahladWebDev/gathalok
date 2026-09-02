import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeatured, fetchTrending } from '../store/slices/storySlice';
import { openAuthModal } from '../store/slices/uiSlice';
import StoryCard from '../components/story/StoryCard';
import api from '../utils/api';
import { CATEGORIES } from '../assets/data/categories';
import heroBanner from "../assets/data/hero.png";
import './Home.css';

/* ─── Static data ─────────────────────────────────────────── */
const COUNTRIES_SECTION = [
  { name: 'India',    emoji: '🇮🇳', stories: '84', color: '#8B1A1A' },
  { name: 'Mexico',   emoji: '🌵', stories: '61', color: '#1A5276' },
  { name: 'Ireland',  emoji: '☘️', stories: '53', color: '#117A65' },
  { name: 'Japan',    emoji: '🎎', stories: '38', color: '#5D4E37' },
  { name: 'Egypt',    emoji: '🐫', stories: '47', color: '#4A0E8F' },
  { name: 'Greece',   emoji: '🏛️', stories: '55', color: '#C17900' },
];

const VOICES = [
  { quote: 'My grandmother told me the same story about the weeping woman near our well. Finding it here made me weep too.', name: 'Priya R.', loc: 'Jaipur, India' },
  { quote: 'I had never heard of these spirits outside my village. This archive taught me they appear in different countries too.', name: 'Arjun M.', loc: 'Mysuru, India' },
  { quote: 'A researcher finally taking indigenous folklore seriously. This is what preservation looks like.', name: 'Meera T.', loc: 'Shillong, India' },
];

const PROCESS = [
  { icon: '📖', step: 'Read', desc: 'Explore 500+ verified stories from every corner of the world.' },
  { icon: '✍️', step: 'Contribute', desc: 'Submit a legend from your region, family, or culture.' },
  { icon: '🔍', step: 'Review', desc: 'Our editorial team verifies and contextualises each story.' },
  { icon: '🌍', step: 'Preserve', desc: 'Approved stories join the living archive forever.' },
];

/* ─── Animated counter ────────────────────────────────────── */
function useCounter(target, duration = 1800) {
  const [count, setCount] = useState(0);
  const raf = useRef();
  const start = useRef();
  useEffect(() => {
    start.current = null;
    const step = (ts) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return count;
}

/* ─── Typewriter ──────────────────────────────────────────── */
const PHRASES = ['Sacred Places', 'Ghost Stories', 'Tribal Legends', 'Ancient Curses', 'Living Myths'];
function Typewriter() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const full = PHRASES[idx];
    if (!deleting && displayed.length < full.length) {
      const t = setTimeout(() => setDisplayed(full.slice(0, displayed.length + 1)), 60);
      return () => clearTimeout(t);
    }
    if (!deleting && displayed.length === full.length) {
      const t = setTimeout(() => setDeleting(true), 1800);
      return () => clearTimeout(t);
    }
    if (deleting && displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
      return () => clearTimeout(t);
    }
    if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIdx(i => (i + 1) % PHRASES.length);
    }
  }, [displayed, deleting, idx]);
  return (
    <span className="hero__typewriter">
      {displayed}<span className="hero__cursor">|</span>
    </span>
  );
}

/* ─── Mandala SVG ─────────────────────────────────────────── */
function Mandala({ className }) {
  return (
    <svg className={className} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="200" r="190" stroke="rgba(183,140,62,0.08)" strokeWidth="1"/>
      <circle cx="200" cy="200" r="170" stroke="rgba(183,140,62,0.06)" strokeWidth="1"/>
      <circle cx="200" cy="200" r="150" stroke="rgba(183,140,62,0.1)" strokeWidth="0.5"/>
      {Array.from({length: 16}).map((_, i) => {
        const a = (i * 360 / 16) * Math.PI / 180;
        const a2 = ((i + 0.5) * 360 / 16) * Math.PI / 180;
        const x1 = 200 + 170 * Math.cos(a); const y1 = 200 + 170 * Math.sin(a);
        const x2 = 200 + 130 * Math.cos(a2); const y2 = 200 + 130 * Math.sin(a2);
        const x3 = 200 + 170 * Math.cos(a + Math.PI / 8); const y3 = 200 + 170 * Math.sin(a + Math.PI / 8);
        return <path key={i} d={`M200 200 L${x1} ${y1} L${x2} ${y2} L${x3} ${y3}Z`} fill="rgba(183,140,62,0.04)" stroke="rgba(183,140,62,0.15)" strokeWidth="0.5"/>;
      })}
      {Array.from({length: 8}).map((_, i) => {
        const a = (i * 45) * Math.PI / 180;
        const x1 = 200 + 100 * Math.cos(a); const y1 = 200 + 100 * Math.sin(a);
        const cx1 = 200 + 80 * Math.cos(a - 0.3); const cy1 = 200 + 80 * Math.sin(a - 0.3);
        const cx2 = 200 + 80 * Math.cos(a + 0.3); const cy2 = 200 + 80 * Math.sin(a + 0.3);
        return <path key={i} d={`M200 200 Q${cx1} ${cy1} ${x1} ${y1} Q${cx2} ${cy2} 200 200`} fill="rgba(183,140,62,0.07)" stroke="rgba(183,140,62,0.2)" strokeWidth="0.5"/>;
      })}
      {Array.from({length: 24}).map((_, i) => {
        const a = (i * 15) * Math.PI / 180;
        const x = 200 + 115 * Math.cos(a); const y = 200 + 115 * Math.sin(a);
        return <circle key={i} cx={x} cy={y} r="1.5" fill="rgba(183,140,62,0.3)"/>;
      })}
      <circle cx="200" cy="200" r="24" fill="rgba(183,140,62,0.05)" stroke="rgba(183,140,62,0.3)" strokeWidth="1"/>
      <circle cx="200" cy="200" r="10" fill="rgba(183,140,62,0.15)"/>
      <circle cx="200" cy="200" r="4" fill="rgba(183,140,62,0.6)"/>
    </svg>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { featured, trending } = useSelector(s => s.stories);
  const { user } = useSelector(s => s.auth);

  const [recent, setRecent] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVoice, setActiveVoice] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const statsRef = useRef();
  const [statsVisible, setStatsVisible] = useState(false);

  const storiesCount = useCounter(statsVisible ? 500 : 0, 1600);
  const countriesCount = useCounter(statsVisible ? 20 : 0, 1000);
  const readersCount = useCounter(statsVisible ? 10000 : 0, 2000);

  useEffect(() => {
    dispatch(fetchFeatured());
    dispatch(fetchTrending());
    api.get('/stories', { params: { limit: 6, sort: '-createdAt' } })
      .then(r => setRecent(r.data.data)).catch(() => {});
    const t = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(t);
  }, [dispatch]);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveVoice(v => (v + 1) % VOICES.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!featured.length) return;
    const t = setInterval(() => setCarouselIdx(i => (i + 1) % Math.min(featured.length, 5)), 5000);
    return () => clearInterval(t);
  }, [featured.length]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const heroStory = featured[carouselIdx] || featured[0];
  const heroPlaceholder = heroBanner;
  const heroBg = heroStory?.coverImage?.url || heroPlaceholder;

  return (
    <div className={`home ${heroLoaded ? 'home--loaded' : ''}`}>

      {/* ══════════════════════════════════════════════════════
          HERO — Full image with text below
      ══════════════════════════════════════════════════════ */}
      <section className="lp-hero">
        <div className="lp-hero__image-wrapper">
          <img src={heroBg} alt="GathaLok Hero Banner" className="lp-hero__image" />
        </div>
        
        {/* Text content below the image */}
        <div className="lp-hero__content-wrapper">
          <div className="container">
            <div className="lp-hero__text-content">
              <p className="lp-hero__eyebrow">
                <span className="lp-hero__eyebrow-line" />
                World Folklore Archive
                <span className="lp-hero__eyebrow-line" />
              </p>

              <h1 className="lp-hero__title">
                Every village holds a ghost.<br />
                <span className="lp-hero__title-gold">We keep them alive.</span>
              </h1>

              <p className="lp-hero__subtitle">
                Discover <Typewriter /> from 20+ countries around the world —<br className="lp-hero__br"/>
                preserved by the communities who lived them.
              </p>

              <form className="lp-hero__search" onSubmit={handleSearch}>
                <span className="lp-hero__search-icon">🔍</span>
                <input
                  className="lp-hero__search-input"
                  placeholder="Search: Bhangarh, Vetala, Sundarbans…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-gold lp-hero__search-btn">Search</button>
              </form>

              <div className="lp-hero__actions">
                <Link to="/explore" className="lp-hero__cta-primary">
                  Explore Archive
                  <span className="lp-hero__cta-arrow">→</span>
                </Link>
                <Link to="/map" className="lp-hero__cta-secondary">🗺 World Map</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          STATS — Animated counters
      ══════════════════════════════════════════════════════ */}
      <div className="lp-stats" ref={statsRef}>
        <div className="container lp-stats__inner">
          <div className="lp-stats__item">
            <span className="lp-stats__num">{storiesCount.toLocaleString()}+</span>
            <span className="lp-stats__label">Stories Archived</span>
          </div>
          <div className="lp-stats__sep" />
          <div className="lp-stats__item">
            <span className="lp-stats__num">{countriesCount}</span>
            <span className="lp-stats__label">Countries Covered</span>
          </div>
          <div className="lp-stats__sep" />
          <div className="lp-stats__item">
            <span className="lp-stats__num">{readersCount.toLocaleString()}+</span>
            <span className="lp-stats__label">Monthly Readers</span>
          </div>
          <div className="lp-stats__sep" />
          <div className="lp-stats__item">
            <span className="lp-stats__num">{CATEGORIES.length}</span>
            <span className="lp-stats__label">Story Categories</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TRENDING — Asymmetric editorial grid
      ══════════════════════════════════════════════════════ */}
      {trending.length > 0 && (
        <section className="lp-section lp-trending">
          <div className="container">
            <header className="lp-section__header">
              <div className="lp-section__label">This Week</div>
              <h2 className="lp-section__title">Trending Tales</h2>
              <Link to="/explore?sort=-views" className="lp-section__link">View all →</Link>
            </header>
            <div className="lp-trending__grid">
              {trending.slice(0, 5).map((s, i) => (
                <div key={s._id} className={`lp-trending__cell lp-trending__cell--${i}`}>
                  <StoryCard story={s} size={i === 0 ? 'large' : 'normal'} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          COUNTRIES — Horizontal scroll with glow cards
      ══════════════════════════════════════════════════════ */}
      <section className="lp-section lp-states">
        <div className="container">
          <header className="lp-section__header">
            <div className="lp-section__label">Explore by Region</div>
            <h2 className="lp-section__title">Journey Across the World</h2>
            <Link to="/map" className="lp-section__link">Open Map →</Link>
          </header>
        </div>
        <div className="lp-states__scroll-wrap">
          <div className="lp-states__track">
            {COUNTRIES_SECTION.map(country => (
              <Link
                key={country.name}
                to={`/countries/${encodeURIComponent(country.name)}`}
                className="lp-state-card"
                style={{ '--state-color': country.color }}
              >
                <div className="lp-state-card__glow" />
                <span className="lp-state-card__emoji">{country.emoji}</span>
                <span className="lp-state-card__name">{country.name}</span>
                <span className="lp-state-card__count">{country.stories} tales</span>
                <span className="lp-state-card__arrow">→</span>
              </Link>
            ))}
            {COUNTRIES_SECTION.map(country => (
              <Link
                key={`${country.name}-2`}
                to={`/countries/${encodeURIComponent(country.name)}`}
                className="lp-state-card"
                style={{ '--state-color': country.color }}
                aria-hidden="true"
                tabIndex={-1}
              >
                <div className="lp-state-card__glow" />
                <span className="lp-state-card__emoji">{country.emoji}</span>
                <span className="lp-state-card__name">{country.name}</span>
                <span className="lp-state-card__count">{country.stories} tales</span>
                <span className="lp-state-card__arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CATEGORIES — 8-up icon grid with colour-wash hover
      ══════════════════════════════════════════════════════ */}
      <section className="lp-section lp-categories">
        <div className="container">
          <header className="lp-section__header">
            <div className="lp-section__label">Discover</div>
            <h2 className="lp-section__title">Browse by Category</h2>
          </header>
          <div className="lp-cat-grid">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                to={`/explore?category=${cat.slug}`}
                className="lp-cat-card"
                style={{ '--cat': cat.color }}
              >
                <div className="lp-cat-card__fill" />
                <span className="lp-cat-card__icon">{cat.icon}</span>
                <span className="lp-cat-card__name">{cat.name}</span>
                <span className="lp-cat-card__chevron">↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          VOICES — Community testimonials
      ══════════════════════════════════════════════════════ */}
      <section className="lp-voices">
        <Mandala className="lp-voices__mandala" />
        <div className="container lp-voices__inner">
          <div className="lp-section__label lp-voices__label">From Our Community</div>
          <div className="lp-voices__stage">
            {VOICES.map((v, i) => (
              <div
                key={i}
                className={`lp-voice ${i === activeVoice ? 'lp-voice--active' : i === (activeVoice + VOICES.length - 1) % VOICES.length ? 'lp-voice--prev' : 'lp-voice--next'}`}
              >
                <p className="lp-voice__quote">"{v.quote}"</p>
                <div className="lp-voice__credit">
                  <span className="lp-voice__name">{v.name}</span>
                  <span className="lp-voice__loc">📍 {v.loc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="lp-voices__dots">
            {VOICES.map((_, i) => (
              <button
                key={i}
                className={`lp-voices__dot ${i === activeVoice ? 'lp-voices__dot--active' : ''}`}
                onClick={() => setActiveVoice(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section className="lp-section lp-how">
        <div className="container">
          <header className="lp-section__header lp-section__header--center">
            <div className="lp-section__label">The Archive</div>
            <h2 className="lp-section__title">How Preservation Works</h2>
          </header>
          <div className="lp-how__steps">
            {PROCESS.map((p, i) => (
              <div key={i} className="lp-how__step">
                <div className="lp-how__step-num">0{i + 1}</div>
                <div className="lp-how__step-icon">{p.icon}</div>
                <h3 className="lp-how__step-title">{p.step}</h3>
                <p className="lp-how__step-desc">{p.desc}</p>
                {i < PROCESS.length - 1 && <div className="lp-how__connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          RECENT — Grid of 6
      ══════════════════════════════════════════════════════ */}
      {recent.length > 0 && (
        <section className="lp-section">
          <div className="container">
            <header className="lp-section__header">
              <div className="lp-section__label">Fresh from the Archives</div>
              <h2 className="lp-section__title">Recently Added</h2>
              <Link to="/explore?sort=-createdAt" className="lp-section__link">View all →</Link>
            </header>
            <div className="grid-3">
              {recent.map(s => <StoryCard key={s._id} story={s} />)}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          FINAL CTA — Full-bleed atmospheric
      ══════════════════════════════════════════════════════ */}
      <section className="lp-cta">
        <Mandala className="lp-cta__mandala" />
        <div className="container lp-cta__inner">
          <p className="lp-cta__eyebrow">✦ Join the Archive ✦</p>
          <h2 className="lp-cta__title">
            Your village has a story<br />
            the world should hear.
          </h2>
          <p className="lp-cta__body">
            Every family holds a legend passed through generations. Every region has a haunting
            no outsider has written down. Help us preserve oral heritage from around the world before
            the last teller falls silent.
          </p>
          <div className="lp-cta__actions">
            {user ? (
              <Link to="/contribute" className="lp-cta__btn-primary">Share Your Story →</Link>
            ) : (
              <>
                <button className="lp-cta__btn-primary" onClick={() => dispatch(openAuthModal('register'))}>
                  Create Free Account
                </button>
                <Link to="/explore" className="lp-cta__btn-secondary">Browse First</Link>
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
