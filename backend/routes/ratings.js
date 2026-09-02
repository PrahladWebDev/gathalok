const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { rateStory, getUserRating } = require('../controllers/interactionController');
router.post('/:storyId', protect, rateStory);
router.get('/:storyId/me', protect, getUserRating);
module.exports = router;
