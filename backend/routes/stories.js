const express = require('express');
const router = express.Router();
const { protect, optionalAuth, isAdmin, isContributor } = require('../middleware/auth');
const ctrl = require('../controllers/storyController');
const { toggleLikeStory } = require('../controllers/interactionController');

router.get('/',              optionalAuth, ctrl.getStories);
router.get('/trending',      ctrl.getTrending);
router.get('/featured',      ctrl.getFeatured);
router.post('/report',       protect, ctrl.reportContent);
router.get('/id/:id',        protect, ctrl.getStoryById);
// Specific :id/action routes MUST come before /:slug and /:id wildcards
router.patch('/:id/review',  protect, isAdmin, ctrl.reviewStory);
router.patch('/:id/like',    protect, toggleLikeStory);
router.put('/:id',           protect, ctrl.updateStory);
router.delete('/:id',        protect, ctrl.deleteStory);
router.get('/:slug',         optionalAuth, ctrl.getStory);
router.post('/',             protect, isContributor, ctrl.createStory);

module.exports = router;
