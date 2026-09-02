// Countries list — with lat/lng for Leaflet map markers and GeoJSON matching names
export const COUNTRIES = [
  { name: 'India',          code: 'IN', emoji: '🇮🇳', lat: 20.5937,  lng: 78.9629  },
  { name: 'Nepal',          code: 'NP', emoji: '🇳🇵', lat: 28.3949,  lng: 84.1240  },
  { name: 'Sri Lanka',      code: 'LK', emoji: '🇱🇰', lat: 7.8731,   lng: 80.7718  },
  { name: 'Bangladesh',     code: 'BD', emoji: '🇧🇩', lat: 23.6850,  lng: 90.3563  },
  { name: 'Bhutan',         code: 'BT', emoji: '🇧🇹', lat: 27.5142,  lng: 90.4336  },
  { name: 'Pakistan',       code: 'PK', emoji: '🇵🇰', lat: 30.3753,  lng: 69.3451  },
  { name: 'China',          code: 'CN', emoji: '🇨🇳', lat: 35.8617,  lng: 104.1954 },
  { name: 'Japan',          code: 'JP', emoji: '🇯🇵', lat: 36.2048,  lng: 138.2529 },
  { name: 'Thailand',       code: 'TH', emoji: '🇹🇭', lat: 15.8700,  lng: 100.9925 },
  { name: 'Indonesia',      code: 'ID', emoji: '🇮🇩', lat: -0.7893,  lng: 113.9213 },
  { name: 'Vietnam',        code: 'VN', emoji: '🇻🇳', lat: 14.0583,  lng: 108.2772 },
  { name: 'Cambodia',       code: 'KH', emoji: '🇰🇭', lat: 12.5657,  lng: 104.9910 },
  { name: 'Mexico',         code: 'MX', emoji: '🇲🇽', lat: 23.6345,  lng: -102.5528},
  { name: 'Egypt',          code: 'EG', emoji: '🇪🇬', lat: 26.8206,  lng: 30.8025  },
  { name: 'Greece',         code: 'GR', emoji: '🇬🇷', lat: 39.0742,  lng: 21.8243  },
  { name: 'Ireland',        code: 'IE', emoji: '🇮🇪', lat: 53.1424,  lng: -7.6921  },
  { name: 'United Kingdom', code: 'GB', emoji: '🇬🇧', lat: 55.3781,  lng: -3.4360  },
  { name: 'Nigeria',        code: 'NG', emoji: '🇳🇬', lat: 9.0820,   lng: 8.6753   },
  { name: 'Brazil',         code: 'BR', emoji: '🇧🇷', lat: -14.2350, lng: -51.9253 },
  { name: 'United States',  code: 'US', emoji: '🇺🇸', lat: 37.0902,  lng: -95.7129 },
];

// Map country names to their GeoJSON feature names (Natural Earth / standard GeoJSON)
export const COUNTRY_GEOJSON_NAMES = {
  'India':          'India',
  'Nepal':          'Nepal',
  'Sri Lanka':      'Sri Lanka',
  'Bangladesh':     'Bangladesh',
  'Bhutan':         'Bhutan',
  'Pakistan':       'Pakistan',
  'China':          'China',
  'Japan':          'Japan',
  'Thailand':       'Thailand',
  'Indonesia':      'Indonesia',
  'Vietnam':        'Vietnam',
  'Cambodia':       'Cambodia',
  'Mexico':         'Mexico',
  'Egypt':          'Egypt',
  'Greece':         'Greece',
  'Ireland':        'Ireland',
  'United Kingdom': 'United Kingdom',
  'Nigeria':        'Nigeria',
  'Brazil':         'Brazil',
  'United States':  'United States of America',
};

export const COUNTRY_STORIES = {
  'India':     { color: '#D4660A' },
  'Mexico':    { color: '#1E8449' },
  'Ireland':   { color: '#117A65' },
  'Japan':     { color: '#8B1A1A' },
  'Egypt':     { color: '#B78C3E' },
  'Greece':    { color: '#1A5276' },
};

export const getCountryColor = (countryName) => {
  return COUNTRY_STORIES[countryName]?.color || '#B78C3E';
};
