const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Achievement } = require('../models/index');

router.get('/', async (req, res) => {
  try {
    const all = await Achievement.find().sort('xpValue');
    res.json({ success: true, data: all });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch achievements.' });
  }
});

module.exports = router;
