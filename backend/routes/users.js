const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getReadingHistory, updateReadingProgress } = require('../controllers/interactionController');
router.get('/reading-history', protect, getReadingHistory);
router.patch('/reading-progress/:storyId', protect, updateReadingProgress);
module.exports = router;
