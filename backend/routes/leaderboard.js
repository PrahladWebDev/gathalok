const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/adminController');
router.get('/', getLeaderboard);
module.exports = router;
