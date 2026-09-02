// Hardcoded story categories — NOT fetched from seeded backend data.
// Keep this list in sync with backend/utils/categories.js.
export const CATEGORIES = [
  { slug: 'ghost-stories',           name: 'Ghost Stories',           icon: '👻', color: '#4A0E8F' },
  { slug: 'mythological-creatures',  name: 'Mythological Creatures',  icon: '🐉', color: '#8B1A1A' },
  { slug: 'tribal-legends',          name: 'Tribal Legends',          icon: '🪘', color: '#5D4E37' },
  { slug: 'sacred-places',           name: 'Sacred Places',           icon: '🛕', color: '#C17900' },
  { slug: 'folk-tales',              name: 'Folk Tales',              icon: '📜', color: '#1A5276' },
  { slug: 'demigods-heroes',         name: 'Demigods & Heroes',       icon: '⚔️', color: '#1E8449' },
  { slug: 'nature-spirits',          name: 'Nature Spirits',          icon: '🌿', color: '#117A65' },
  { slug: 'cursed-places',           name: 'Cursed Places',           icon: '⛓️', color: '#641E16' },
  { slug: 'urban-legends',           name: 'Urban Legends',           icon: '🏙️', color: '#2C3E50' },
  { slug: 'gods-goddesses',          name: 'Gods & Goddesses',        icon: '🕉️', color: '#B7950B' },
  { slug: 'witches-sorcery',         name: 'Witches & Sorcery',       icon: '🧙', color: '#6C3483' },
  { slug: 'festivals-rituals',       name: 'Festivals & Rituals',     icon: '🪔', color: '#CA6F1E' },
];

export const getCategory = (slug) => CATEGORIES.find(c => c.slug === slug) || null;
