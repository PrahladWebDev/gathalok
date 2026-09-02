const express = require('express');
const router = express.Router();
const { getCountryStats } = require('../controllers/adminController');
const Story = require('../models/Story');
const User = require('../models/User');

router.get('/stats', getCountryStats);

router.get('/:countryName', async (req, res) => {
  try {
    const country = decodeURIComponent(req.params.countryName);
    const [stories, contributors] = await Promise.all([
      Story.find({ country, status: 'approved' })
        .populate('contributor', 'name username avatar')
        .sort('-views')
        .limit(20)
        .lean(),
      User.find({ role: { $in: ['contributor', 'admin'] } })
        .sort('-storiesWritten')
        .limit(5)
        .select('name username avatar storiesWritten'),
    ]);
    const storyCount = await Story.countDocuments({ country, status: 'approved' });
    const featured = stories.find(s => s.isFeatured) || stories[0] || null;
    res.json({ success: true, data: { country, storyCount, stories, contributors, featured } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch country data.' });
  }
});

module.exports = router;
