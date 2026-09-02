const mongoose = require('mongoose');

// ─── Rating ───────────────────────────────────────────────
const ratingSchema = new mongoose.Schema({
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  value: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true });
ratingSchema.index({ story: 1, user: 1 }, { unique: true });
const Rating = mongoose.model('Rating', ratingSchema);

// ─── Bookmark ─────────────────────────────────────────────
const bookmarkSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  story:      { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  collection: { type: String, default: 'All Bookmarks' },
}, { timestamps: true });
bookmarkSchema.index({ user: 1, story: 1 }, { unique: true });
const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

// ─── Reading History ──────────────────────────────────────
const readingHistorySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  story:     { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  timeSpent: { type: Number, default: 0 }, // seconds
  completed: { type: Boolean, default: false },
  readAt:    { type: Date, default: Date.now },
}, { timestamps: true });
readingHistorySchema.index({ user: 1, story: 1 }, { unique: true });
const ReadingHistory = mongoose.model('ReadingHistory', readingHistorySchema);

// ─── Notification ─────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['story_approved', 'story_rejected', 'story_changes', 'story_resubmitted', 'comment', 'reply', 'like', 'achievement', 'feature', 'announcement'],
    required: true,
  },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  link:    { type: String, default: '' }, // relative path to navigate
  isRead:  { type: Boolean, default: false, index: true },
}, { timestamps: true });
const Notification = mongoose.model('Notification', notificationSchema);

// ─── Achievement ──────────────────────────────────────────
const achievementSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true },
  title:       { type: String, required: true },
  description: { type: String, required: true },
  icon:        { type: String, default: '🏆' },
  xpValue:     { type: Number, default: 10 },
  condition: {
    type:      { type: String, enum: ['stories_read', 'stories_written', 'countries_explored', 'likes_received'] },
    threshold: { type: Number },
  },
}, { timestamps: true });
const Achievement = mongoose.model('Achievement', achievementSchema);

// ─── Report ───────────────────────────────────────────────
const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['story', 'comment', 'user'], required: true },
  targetId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: {
    type: String,
    enum: ['spam', 'inaccurate', 'offensive', 'copyright', 'other'],
    required: true,
  },
  description: { type: String, maxlength: 500 },
  status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
}, { timestamps: true });
const Report = mongoose.model('Report', reportSchema);

module.exports = { Rating, Bookmark, ReadingHistory, Notification, Achievement, Report };
