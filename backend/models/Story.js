const mongoose = require('mongoose');
const slugify = require('slugify');
const { CATEGORIES } = require('../utils/categories');

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Story title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters'],
  },
  slug: { type: String, unique: true, index: true },
  alternativeNames: [{ type: String, trim: true }],

  country: {
    type: String,
    required: [true, 'Country is required'],
    index: true,
  },

  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: { values: CATEGORIES.map(c => c.slug), message: 'Invalid category.' },
    index: true,
  },

  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [400, 'Short description cannot exceed 400 characters'],
  },
  fullStory: {
    type: String,
    required: [true, 'Full story is required'],
    minlength: [100, 'Story must be at least 100 characters'],
  },
  origin: { type: String, default: '' },        // historical origin
  significance: { type: String, default: '' },  // cultural significance

  coverImage: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  images: [{
    url: { type: String },
    publicId: { type: String },
    caption: { type: String, default: '' },
  }],

  tags: [{ type: String, lowercase: true, trim: true }],
  references: [{ title: String, url: String }],

  contributor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'changes_requested'],
    default: 'draft',
    index: true,
  },
  adminNote: { type: String, default: '' }, // rejection/change reason
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },

  isFeatured: { type: Boolean, default: false, index: true },
  featuredUntil: { type: Date },

  // Aggregated stats (updated via post-save hooks on Rating/Comment)
  views:         { type: Number, default: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings:  { type: Number, default: 0 },
  totalComments: { type: Number, default: 0 },
  totalBookmarks: { type: Number, default: 0 },
  likes:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount:     { type: Number, default: 0 },
}, { timestamps: true });

// ─── Indexes ─────────────────────────────────────────────
storySchema.index({ title: 'text', shortDescription: 'text', tags: 'text', alternativeNames: 'text' });

// ─── Slug generation ──────────────────────────────────────
storySchema.pre('save', async function (next) {
  if (!this.isModified('title')) return next();
  let slug = slugify(this.title, { lower: true, strict: true });
  const existing = await this.constructor.findOne({ slug });
  if (existing && existing._id.toString() !== this._id.toString()) {
    slug = `${slug}-${Date.now()}`;
  }
  this.slug = slug;
  next();
});

module.exports = mongoose.model('Story', storySchema);
