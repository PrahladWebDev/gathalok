const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // for replies
  content: {
    type: String,
    required: [true, 'Comment cannot be empty'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    trim: true,
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  isReported: { type: Boolean, default: false },
  isHidden:   { type: Boolean, default: false },
  replyCount: { type: Number, default: 0 },
}, { timestamps: true });

// Update like count
commentSchema.pre('save', function (next) {
  this.likeCount = this.likes.length;
  next();
});

module.exports = mongoose.model('Comment', commentSchema);
