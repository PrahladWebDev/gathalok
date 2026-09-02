import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { COUNTRIES, COUNTRY_GEOJSON_NAMES } from '../assets/data/countries';
import api from '../utils/api';
import './MapPage.css';

// Fix leaflet default icon paths broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Build a lookup: geoJSON country name → our COUNTRIES entry
const GEO_TO_COUNTRY = {};
COUNTRIES.forEach(c => {
  const geoName = COUNTRY_GEOJSON_NAMES[c.name];
  if (geoName) GEO_TO_COUNTRY[geoName] = c;
});

// Fly to a country on selection
function FlyTo({ country }) {
  const map = useMap();
  useEffect(() => {
    if (country) {
      map.flyTo([country.lat, country.lng], 5, { duration: 1.2 });
    }
  }, [country, map]);
  return null;
}

// Create a circular marker icon for a country
function makeMarkerIcon(count, isSelected) {
  const size = count > 30 ? 36 : count > 10 ? 28 : 22;
  const bg   = isSelected ? '#f0c040' : 'rgba(183,140,62,0.92)';
  const html = `
    <div style="
      width:${size}px;height:${size}px;
      background:${bg};
      border:2.5px solid ${isSelected ? '#fff' : '#0d0a1a'};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-family:sans-serif;font-weight:700;font-size:${size > 28 ? 11 : 9}px;
      color:#0d0a1a;
      box-shadow:0 2px 8px rgba(0,0,0,0.55);
      cursor:pointer;
    ">${count > 0 ? count : ''}</div>`;
  return L.divIcon({ html, className: '', iconAnchor: [size / 2, size / 2] });
}

const MapPage = () => {
  const [countryStats,    setCountryStats]    = useState({});
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryStories,  setCountryStories]  = useState([]);
  const [loadingStories,  setLoadingStories]  = useState(false);
  const [worldGeoJSON,    setWorldGeoJSON]    = useState(null);
  const [searchQuery,     setSearchQuery]     = useState('');
  const geoJsonRef = useRef(null);

  // Load world GeoJSON (Natural Earth via CDN)
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(r => r.json())
      .then(data => {
        // Keep only features whose name matches one of our countries
        const filtered = {
          ...data,
          features: data.features.filter(f => {
            const n = f.properties.ADMIN || f.properties.name;
            return !!GEO_TO_COUNTRY[n];
          }),
        };
        setWorldGeoJSON(filtered);
      })
      .catch(() => {});
  }, []);

  // Load story counts per country
  useEffect(() => {
    api.get('/countries/stats').then(r => {
      const map = {};
      r.data.data.forEach(c => { map[c._id] = c; });
      setCountryStats(map);
    }).catch(() => {});
  }, []);

  const handleCountryClick = useCallback(async (country) => {
    setSelectedCountry(country);
    setLoadingStories(true);
    try {
      const res = await api.get(`/countries/${encodeURIComponent(country.name)}`);
      setCountryStories(res.data.data.stories || []);
    } catch (_) {
      setCountryStories([]);
    }
    setLoadingStories(false);
  }, []);

  // Style each GeoJSON polygon
  const geoStyle = useCallback((feature) => {
    const name    = feature.properties.ADMIN || feature.properties.name;
    const country = GEO_TO_COUNTRY[name];
    const stats   = country ? countryStats[country.name] : null;
    const count   = stats?.storyCount || 0;
    const isSelected = selectedCountry && country?.code === selectedCountry.code;

    const opacity = count > 30 ? 0.75 : count > 10 ? 0.55 : count > 0 ? 0.38 : 0.18;

    return {
      fillColor:   isSelected ? '#f0c040' : '#b78c3e',
      fillOpacity: isSelected ? 0.85 : opacity,
      color:       isSelected ? '#f0c040' : '#5a4a2a',
      weight:      isSelected ? 2.5 : 1,
    };
  }, [countryStats, selectedCountry]);

  // Bind events to each GeoJSON feature
  const onEachFeature = useCallback((feature, layer) => {
    const name    = feature.properties.ADMIN || feature.properties.name;
    const country = GEO_TO_COUNTRY[name];
    if (!country) return;

    const stats = countryStats[country.name];
    const count = stats?.storyCount || 0;

    layer.on({
      mouseover(e) {
        e.target.setStyle({ fillOpacity: 0.85, weight: 2.5, color: '#f0c040' });
        e.target.bringToFront();
      },
      mouseout(e) {
        if (geoJsonRef.current) geoJsonRef.current.resetStyle(e.target);
        // Re-apply selected style if this is the selected country
        if (selectedCountry && country.code === selectedCountry.code) {
          e.target.setStyle({ fillColor: '#f0c040', fillOpacity: 0.85, color: '#f0c040', weight: 2.5 });
        }
      },
      click() {
        handleCountryClick(country);
      },
    });

    layer.bindTooltip(
      `<div class="map-tooltip">
        <span class="map-tooltip__flag">${country.emoji}</span>
        <strong>${country.name}</strong>
        <span>${count} ${count === 1 ? 'tale' : 'tales'}</span>
      </div>`,
      { sticky: true, className: 'map-leaflet-tooltip', direction: 'top' }
    );
  }, [countryStats, selectedCountry, handleCountryClick]);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="map-page">
      <div className="map-page__header">
        <div className="container">
          <p className="section-eyebrow">Interactive</p>
          <h1 className="map-page__title">World Folklore Map</h1>
          <p className="map-page__subtitle">
            Click any country on the map to explore its myths, ghosts, and legends.
          </p>
        </div>
      </div>

      <div className="map-page__layout">
        {/* ── Real Leaflet Map ── */}
        <div className="map-page__map-wrap">
          <MapContainer
            center={[20, 10]}
            zoom={2}
            minZoom={2}
            maxZoom={8}
            className="map-page__map"
            worldCopyJump={false}
            maxBounds={[[-85, -180], [85, 180]]}
            maxBoundsViscosity={1.0}
          >
            {/* Dark tile layer — CartoDB Dark Matter */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            />

            {/* Country polygons */}
            {worldGeoJSON && (
              <GeoJSON
                key={`${selectedCountry?.code}-${JSON.stringify(countryStats)}`}
                ref={geoJsonRef}
                data={worldGeoJSON}
                style={geoStyle}
                onEachFeature={onEachFeature}
              />
            )}

            {/* Circular markers with story count */}
            {COUNTRIES.map(country => {
              const count      = countryStats[country.name]?.storyCount || 0;
              const isSelected = selectedCountry?.code === country.code;
              return (
                <Marker
                  key={country.code}
                  position={[country.lat, country.lng]}
                  icon={makeMarkerIcon(count, isSelected)}
                  eventHandlers={{ click: () => handleCountryClick(country) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    {country.emoji} {country.name} · {count} {count === 1 ? 'tale' : 'tales'}
                  </Tooltip>
                </Marker>
              );
            })}

            {/* Fly to selected country */}
            {selectedCountry && <FlyTo country={selectedCountry} />}
          </MapContainer>

          {/* Legend */}
          <div className="map-legend">
            <h4>Map Legend</h4>
            <div className="map-legend__items">
              <div className="map-legend__item"><div className="map-legend__dot map-legend__dot--sm" />1–10 tales</div>
              <div className="map-legend__item"><div className="map-legend__dot map-legend__dot--md" />11–30 tales</div>
              <div className="map-legend__item"><div className="map-legend__dot map-legend__dot--lg" />31+ tales</div>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="map-page__sidebar">
          <div className="map-sidebar__search">
            <input
              className="form-input"
              placeholder="Search countries…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {!selectedCountry ? (
            <div className="map-sidebar__state-list">
              <p className="map-sidebar__hint">Click a country on the map or select below</p>
              {filteredCountries.map(country => {
                const count = countryStats[country.name]?.storyCount || 0;
                return (
                  <button
                    key={country.code}
                    className="map-sidebar__state-item"
                    onClick={() => handleCountryClick(country)}
                  >
                    <span className="map-sidebar__state-name">{country.emoji} {country.name}</span>
                    <span className="map-sidebar__state-count">{count} tales</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="map-sidebar__state-detail">
              <div className="map-sidebar__detail-header">
                <button
                  className="map-sidebar__back"
                  onClick={() => { setSelectedCountry(null); setCountryStories([]); }}
                >
                  ← All Countries
                </button>
                <h2 className="map-sidebar__state-title">{selectedCountry.emoji} {selectedCountry.name}</h2>
                <p className="map-sidebar__state-stat">
                  {countryStats[selectedCountry.name]?.storyCount || 0} stories
                  {countryStats[selectedCountry.name]?.totalViews > 0 &&
                    ` · ${countryStats[selectedCountry.name].totalViews.toLocaleString()} views`}
                </p>
                <Link
                  to={`/countries/${encodeURIComponent(selectedCountry.name)}`}
                  className="btn btn-gold btn-sm btn-full"
                  style={{ marginTop: '0.75rem' }}
                >
                  Explore Full Page →
                </Link>
              </div>

              <hr className="divider" style={{ margin: '1rem 0' }} />

              {loadingStories ? (
                <div className="spinner" />
              ) : countryStories.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                  <div className="icon">🌑</div>
                  <h3>No stories yet</h3>
                  <p>Be the first to share a legend from {selectedCountry.name}!</p>
                </div>
              ) : (
                <div className="map-sidebar__stories">
                  {countryStories.slice(0, 8).map(story => (
                    <Link
                      key={story._id}
                      to={`/stories/${story.slug}`}
                      className="map-story-item"
                    >
                      <div
                        className="map-story-item__img"
                        style={{
                          backgroundImage: story.coverImage?.url
                            ? `url(${story.coverImage.url})`
                            : 'linear-gradient(135deg, var(--surface), var(--surface-2))',
                        }}
                      />
                      <div className="map-story-item__info">
                        <h4 className="map-story-item__title">{story.title}</h4>
                        <p className="map-story-item__meta">
                          ★ {story.averageRating?.toFixed(1) || 'N/A'} · {story.views || 0} views
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default MapPage;
