const crypto = require('crypto');
const User = require('../models/User');
const { Achievement } = require('../models/index');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../utils/email');

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

    const rawToken = user.getVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendVerificationEmail(user, rawToken);
    } catch (emailErr) {
      console.error('❌ Failed to send verification email:', emailErr.message);
      return res.status(201).json({
        success: true,
        requiresVerification: true,
        email: user.email,
        message: 'Account created, but we could not send the verification email. Please use "Resend verification email" to try again.',
      });
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      email: user.email,
      message: 'Account created! Please check your email to verify your account before signing in.',
    });
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
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        notVerified: true,
        email: user.email,
        message: 'Please verify your email before signing in.',
      });
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

// ─── Verify Email ──────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ success: false, message: 'Verification token is required.' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'This verification link is invalid or has expired.' });
    }

    if (user.isVerified) {
      return res.json({ success: true, message: 'Your email is already verified.', alreadyVerified: true });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendToken(user, 200, res, 'Email verified successfully! Welcome to GathaLok.');
  } catch (err) {
    res.status(500).json({ success: false, message: 'Email verification failed. Please try again.' });
  }
};

// ─── Resend Verification Email ──────────────────────────────
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await User.findOne({ email });
    // Don't reveal whether the account exists.
    if (!user) {
      return res.json({ success: true, message: 'If an account with that email exists, a verification link has been sent.' });
    }
    if (user.isVerified) {
      return res.json({ success: true, message: 'This email is already verified. You can sign in now.', alreadyVerified: true });
    }

    const rawToken = user.getVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendVerificationEmail(user, rawToken);
    } catch (emailErr) {
      console.error('❌ Failed to send verification email:', emailErr.message);
      return res.status(500).json({ success: false, message: 'Failed to send verification email. Please try again shortly.' });
    }

    res.json({ success: true, message: 'Verification email sent! Please check your inbox.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resend verification email.' });
  }
};

// ─── Forgot Password ─────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await User.findOne({ email });
    // Always respond generically so we don't leak which emails are registered.
    const genericMessage = 'If an account with that email exists, a password reset link has been sent.';
    if (!user) return res.json({ success: true, message: genericMessage });

    const rawToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendResetPasswordEmail(user, rawToken);
    } catch (emailErr) {
      console.error('❌ Failed to send password reset email:', emailErr.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again shortly.' });
    }

    res.json({ success: true, message: genericMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process password reset request.' });
  }
};

// ─── Reset Password ───────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'This password reset link is invalid or has expired.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    // A successful reset proves ownership of the inbox, so verify the account too.
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    await user.save();

    sendToken(user, 200, res, 'Password reset successfully! You are now signed in.');
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password reset failed. Please try again.' });
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
