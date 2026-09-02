const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getNotifications, markRead } = require('../controllers/interactionController');
router.get('/', protect, getNotifications);
router.patch('/read', protect, markRead);
module.exports = router;
