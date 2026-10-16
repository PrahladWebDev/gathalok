// Local photos for the home page — bundled into the build, no external hosting.
//   src/assets/realms/<country-name-lowercase-with-dashes>.jpg   (800x600)   e.g. united-kingdom.jpg
//   src/assets/categories/<category-slug>.jpg                    (512x512)   e.g. ghost-stories.jpg
// Drop a file in the folder and it is picked up automatically — no list to edit.
// Anything without a file falls back to a colour gradient / emoji.
const load = (ctx) => {
  const map = {};
  ctx.keys().forEach((k) => {
    map[k.replace(/^\.\//, '').replace(/\.jpg$/, '')] = ctx(k);
  });
  return map;
};

const realms = load(require.context('../realms', false, /\.jpg$/));
const categories = load(require.context('../categories', false, /\.jpg$/));

export const getRealmImage = (countryName) =>
  realms[String(countryName).toLowerCase().replace(/\s+/g, '-')] || null;

export const getCategoryImage = (slug) => categories[slug] || null;
