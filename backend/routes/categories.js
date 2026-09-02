const express = require('express');
const router = express.Router();
const { CATEGORIES } = require('../utils/categories');
const Story = require('../models/Story');

// Categories are hardcoded in code (backend/utils/categories.js), not seeded in the DB.
router.get('/', (req, res) => {
  res.json({ success: true, data: CATEGORIES });
});

router.get('/stats', async (req, res) => {
  try {
    const counts = await Story.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id] = c.count; });
    const stats = CATEGORIES.map(c => ({
      slug: c.slug, name: c.name, icon: c.icon, color: c.color,
      count: countMap[c.slug] || 0,
    })).sort((a, b) => b.count - a.count);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch category stats.' });
  }
});

module.exports = router;
