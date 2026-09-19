const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const { getReadingHistory, updateReadingProgress } = require('../controllers/interactionController');
const ctrl = require('../controllers/userController');

// Own reading data (must stay above the /:username wildcard)
router.get('/reading-history', protect, getReadingHistory);
router.patch('/reading-progress/:storyId', protect, updateReadingProgress);
router.get('/me/following', protect, ctrl.getMyFollowing);

// Follow / unfollow (by user id)
router.get('/:id/follow-status', protect, ctrl.getFollowStatus);
router.post('/:id/follow',       protect, ctrl.followUser);
router.delete('/:id/follow',     protect, ctrl.unfollowUser);

// Public profile (by username)
router.get('/:username/stories',   optionalAuth, ctrl.getUserStories);
router.get('/:username/followers', optionalAuth, ctrl.getFollowers);
router.get('/:username/following', optionalAuth, ctrl.getFollowing);
router.get('/:username',           optionalAuth, ctrl.getPublicProfile);

module.exports = router;
