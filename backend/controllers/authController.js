const User = require('../models/User');
const { Achievement } = require('../models/index');

// ─── Helpers ──────────────────────────────────────────────
const sendToken = (user, statusCode, res, message) => {
  const token = user.getSignedToken();
  const data = {
    _id:      user._id,
    name:     user.name,
    username: user.username,
    email:    user.email,
    role:     user.role,
    avatar:   user.avatar,
    bio:      user.bio,
    achievements: user.achievements,
    storiesRead:  user.storiesRead,
    storiesWritten: user.storiesWritten,
  };
  res.status(statusCode).json({ success: true, message, token, user: data });
};

// ─── Register ─────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ success: false, message: 'Email already registered.' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ success: false, message: 'Username taken.' });

    const user = await User.create({ name, username, email, password });
    sendToken(user, 201, res, 'Account created successfully.');
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// ─── Login ────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
    }
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    sendToken(user, 200, res, 'Logged in successfully.');
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ─── Get Current User ─────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('achievements.achievementId');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
};

// ─── Update Profile ───────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, username, bio, country, avatar } = req.body;
    const updates = {};
    if (name)                updates.name     = name;
    if (username)            updates.username = username;
    if (bio !== undefined)   updates.bio      = bio;
    if (country !== undefined) updates.country  = country;
    // avatar comes as { url, publicId } from the Cloudinary upload step
    if (avatar && avatar.url) updates.avatar  = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
      .populate('achievements.achievementId');
    res.json({ success: true, message: 'Profile updated.', user });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Username already taken.' });
    }
    res.status(500).json({ success: false, message: 'Profile update failed.' });
  }
};

// ─── Change Password ──────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both fields are required.' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password change failed.' });
  }
};

// ─── Become Contributor ──────────────────────────────────
exports.becomeContributor = async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(400).json({ success: false, message: `You are already a ${req.user.role}.` });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { role: 'contributor' }, { new: true });
    res.json({ success: true, message: 'You are now a Contributor! Start sharing stories.', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to upgrade role.' });
  }
};
