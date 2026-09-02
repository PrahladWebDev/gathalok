// Hardcoded countries list — used for validation and country-wise stats/map.
// No lat/lng or districts: this app is now organized country-wise, not by Indian states.
const COUNTRIES = [
  { name: 'India',          code: 'IN' },
  { name: 'Nepal',          code: 'NP' },
  { name: 'Sri Lanka',      code: 'LK' },
  { name: 'Bangladesh',     code: 'BD' },
  { name: 'Bhutan',         code: 'BT' },
  { name: 'Pakistan',       code: 'PK' },
  { name: 'China',          code: 'CN' },
  { name: 'Japan',          code: 'JP' },
  { name: 'Thailand',       code: 'TH' },
  { name: 'Indonesia',      code: 'ID' },
  { name: 'Vietnam',        code: 'VN' },
  { name: 'Cambodia',       code: 'KH' },
  { name: 'Mexico',         code: 'MX' },
  { name: 'Egypt',          code: 'EG' },
  { name: 'Greece',         code: 'GR' },
  { name: 'Ireland',        code: 'IE' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'Nigeria',        code: 'NG' },
  { name: 'Brazil',         code: 'BR' },
  { name: 'United States',  code: 'US' },
];

const isValidCountry = (name) => COUNTRIES.some(c => c.name === name);

module.exports = { COUNTRIES, isValidCountry };
