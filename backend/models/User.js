const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [60, 'Name cannot exceed 60 characters'],
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_]{3,20}$/, 'Username must be 3-20 chars: letters, numbers, underscores'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['guest', 'user', 'contributor', 'admin'],
    default: 'user',
  },
  avatar: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  bio: { type: String, maxlength: [300, 'Bio cannot exceed 300 characters'], default: '' },
  country: { type: String, default: '' }, // preferred/home country

  // Stats
  storiesRead:    { type: Number, default: 0 },
  likesReceived:  { type: Number, default: 0 },
  storiesWritten: { type: Number, default: 0 },
  totalLikesReceived: { type: Number, default: 0 },
  countriesExplored: [{ type: String }],

  achievements: [{
    achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
    unlockedAt: { type: Date, default: Date.now },
  }],

  // Names of bookmark collections the user has created (including empty ones).
  // Bookmarks themselves store their own `collection` string (see Bookmark model);
  // this list is what lets an empty collection survive even before any bookmark
  // is moved into it.
  bookmarkCollections: [{ type: String, trim: true, maxlength: 60 }],

  isActive:  { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },

  // ─── Email verification ─────────────────────────────────
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationExpire: Date,

  lastLogin: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true });

// ─── Hash password before save ───────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Methods ─────────────────────────────────────────────
userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.getSignedToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// ─── Email verification token ─────────────────────────────
// Returns the RAW token (goes in the email link). Only the SHA-256 hash
// of it is stored on the user, same pattern as the password reset token.
userSchema.methods.getVerificationToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.verificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return rawToken;
};

// ─── Password reset token ─────────────────────────────────
userSchema.methods.getResetPasswordToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1h
  return rawToken;
};

// ─── Virtual: avatar fallback ─────────────────────────────
userSchema.virtual('avatarUrl').get(function () {
  return this.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=8B1A1A&color=fff`;
});

userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);