// routes/auth.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', protect, ctrl.getMe);
router.put('/profile', protect, ctrl.updateProfile);
router.patch('/me', protect, ctrl.updateProfile);         // alias for Settings
router.put('/password', protect, ctrl.changePassword);
router.patch('/password', protect, ctrl.changePassword);  // alias for Settings
router.post('/become-contributor', protect, ctrl.becomeContributor);
router.patch('/become-contributor', protect, ctrl.becomeContributor); // alias

module.exports = router;
