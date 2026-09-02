const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload, uploadAvatar } = require('../config/cloudinary');

router.post('/story-image', protect, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });
  res.json({ success: true, data: { url: req.file.path, publicId: req.file.filename } });
});

router.post('/avatar', protect, uploadAvatar.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });
  res.json({ success: true, data: { url: req.file.path, publicId: req.file.filename } });
});

module.exports = router;
