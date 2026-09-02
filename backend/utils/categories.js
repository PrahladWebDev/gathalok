// Hardcoded story categories — NOT seeded from the database.
// To add/remove a category, edit this list only (keep frontend/src/assets/data/categories.js in sync).
const CATEGORIES = [
  { slug: 'ghost-stories',           name: 'Ghost Stories',           icon: '👻', color: '#4A0E8F', description: 'Haunted places, spirits, and supernatural encounters.' },
  { slug: 'mythological-creatures',  name: 'Mythological Creatures',  icon: '🐉', color: '#8B1A1A', description: 'Legendary beasts, divine beings, and magical entities.' },
  { slug: 'tribal-legends',          name: 'Tribal Legends',          icon: '🪘', color: '#5D4E37', description: 'Ancient stories passed down by indigenous and tribal communities.' },
  { slug: 'sacred-places',           name: 'Sacred Places',           icon: '🛕', color: '#C17900', description: 'Holy sites, temples, and places of spiritual power.' },
  { slug: 'folk-tales',              name: 'Folk Tales',              icon: '📜', color: '#1A5276', description: 'Traditional stories of everyday heroes and magical encounters.' },
  { slug: 'demigods-heroes',         name: 'Demigods & Heroes',       icon: '⚔️', color: '#1E8449', description: 'Legends of mighty warriors and divine heroes.' },
  { slug: 'nature-spirits',          name: 'Nature Spirits',          icon: '🌿', color: '#117A65', description: 'Spirits of rivers, forests, mountains, and natural elements.' },
  { slug: 'cursed-places',           name: 'Cursed Places',           icon: '⛓️', color: '#641E16', description: 'Sites bearing ancient curses, warnings, and dark histories.' },
  { slug: 'urban-legends',           name: 'Urban Legends',           icon: '🏙️', color: '#2C3E50', description: 'Modern myths and rumors born in cities and towns.' },
  { slug: 'gods-goddesses',          name: 'Gods & Goddesses',        icon: '🕉️', color: '#B7950B', description: 'Deities, divine pantheons, and their stories across cultures.' },
  { slug: 'witches-sorcery',         name: 'Witches & Sorcery',       icon: '🧙', color: '#6C3483', description: 'Tales of magic, witchcraft, and forbidden rituals.' },
  { slug: 'festivals-rituals',       name: 'Festivals & Rituals',     icon: '🪔', color: '#CA6F1E', description: 'Myths and legends tied to festivals, rites, and traditions.' },
];

const isValidCategory = (slug) => CATEGORIES.some(c => c.slug === slug);
const getCategory = (slug) => CATEGORIES.find(c => c.slug === slug) || null;

module.exports = { CATEGORIES, isValidCategory, getCategory };
