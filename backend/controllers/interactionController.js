// ─── Bookmark Controller ──────────────────────────────────
const { Bookmark, Rating, Notification, ReadingHistory } = require('../models/index');
const Story = require('../models/Story');
const User = require('../models/User');
const { checkAndAwardAchievements } = require('../utils/achievements');

// Bookmark Controller
exports.getBookmarks = async (req, res) => {
  try {
    const { collection } = req.query;
    const query = { user: req.user._id };
    if (collection) query.collection = collection;
    const bookmarks = await Bookmark.find(query)
      .populate('story')
      .sort('-createdAt');

    // Merge collections derived from bookmarks with the user's saved
    // (possibly empty) collections so newly created ones survive a refresh.
    const allBookmarks = collection ? await Bookmark.find({ user: req.user._id }) : bookmarks;
    const derived = [...new Set(allBookmarks.map(b => b.collection || 'All Bookmarks'))];
    const saved = req.user.bookmarkCollections || [];
    const collections = [...new Set(['All Bookmarks', ...derived, ...saved])];

    res.json({ success: true, data: bookmarks, collections });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookmarks.' });
  }
};

exports.toggleBookmark = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { collection = 'All Bookmarks' } = req.body;
    const existing = await Bookmark.findOne({ user: req.user._id, story: storyId });
    if (existing) {
      await existing.deleteOne();
      await Story.findByIdAndUpdate(storyId, { $inc: { totalBookmarks: -1 } });
      return res.json({ success: true, bookmarked: false, message: 'Bookmark removed.' });
    }
    await Bookmark.create({ user: req.user._id, story: storyId, collection });
    await Story.findByIdAndUpdate(storyId, { $inc: { totalBookmarks: 1 } });
    res.json({ success: true, bookmarked: true, message: 'Bookmarked!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle bookmark.' });
  }
};

exports.moveBookmark = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { collection } = req.body;
    const bookmark = await Bookmark.findOneAndUpdate(
      { user: req.user._id, story: storyId },
      { collection },
      { new: true }
    );
    if (!bookmark) return res.status(404).json({ success: false, message: 'Bookmark not found.' });

    // Make sure this collection is registered so it persists even if it
    // later becomes empty again.
    if (collection && collection !== 'All Bookmarks') {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { bookmarkCollections: collection } });
    }

    res.json({ success: true, message: `Moved to ${collection}.`, data: bookmark });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to move bookmark.' });
  }
};

exports.createCollection = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Collection name is required.' });
    if (name === 'All Bookmarks') {
      return res.status(400).json({ success: false, message: '"All Bookmarks" is a reserved name.' });
    }
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { bookmarkCollections: name } });
    res.json({ success: true, message: 'Collection created.', data: name });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create collection.' });
  }
};

exports.deleteCollection = async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name || '').trim();
    if (!name || name === 'All Bookmarks') {
      return res.status(400).json({ success: false, message: 'Invalid collection name.' });
    }
    // Move any bookmarks in this collection back to "All Bookmarks" rather
    // than deleting them.
    await Bookmark.updateMany(
      { user: req.user._id, collection: name },
      { collection: 'All Bookmarks' }
    );
    await User.findByIdAndUpdate(req.user._id, { $pull: { bookmarkCollections: name } });
    res.json({ success: true, message: 'Collection deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete collection.' });
  }
};

// Rating Controller
exports.rateStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { value } = req.body;
    if (!value || value < 1 || value > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1-5.' });
    }
    const rating = await Rating.findOneAndUpdate(
      { user: req.user._id, story: storyId },
      { value },
      { upsert: true, new: true }
    );
    // Recalculate average
    const all = await Rating.find({ story: storyId });
    const avg = all.reduce((s, r) => s + r.value, 0) / all.length;
    await Story.findByIdAndUpdate(storyId, {
      averageRating: Math.round(avg * 10) / 10,
      totalRatings: all.length,
    });
    res.json({ success: true, message: 'Rating saved.', data: { value: rating.value, average: Math.round(avg * 10) / 10, total: all.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to rate story.' });
  }
};

exports.getUserRating = async (req, res) => {
  try {
    const rating = await Rating.findOne({ user: req.user._id, story: req.params.storyId });
    res.json({ success: true, data: rating });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get rating.' });
  }
};

// Notification Controller
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') query.isRead = false;
    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'name username avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);
    res.json({ success: true, data: notifications, unreadCount, pagination: { page: Number(page), total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { ids } = req.body; // array of notification ids, or 'all'
    if (ids === 'all') {
      await Notification.updateMany({ recipient: req.user._id }, { isRead: true });
    } else {
      await Notification.updateMany({ _id: { $in: ids }, recipient: req.user._id }, { isRead: true });
    }
    res.json({ success: true, message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications.' });
  }
};

// Reading History Controller
exports.getReadingHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const history = await ReadingHistory.find({ user: req.user._id })
      .populate({ path: 'story', select: 'title slug coverImage country category averageRating' })
      .sort('-readAt')
      .skip(skip)
      .limit(Number(limit));
    const total = await ReadingHistory.countDocuments({ user: req.user._id });
    res.json({ success: true, data: history, pagination: { page: Number(page), total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reading history.' });
  }
};

exports.updateReadingProgress = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { timeSpent, completed } = req.body;
    const entry = await ReadingHistory.findOneAndUpdate(
      { user: req.user._id, story: storyId },
      { $inc: { timeSpent: timeSpent || 0 }, completed: completed || false, readAt: new Date() },
      { upsert: true, new: true }
    );
    if (completed) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { storiesRead: 1 } });
      // Check achievements asynchronously (fire and forget)
      checkAndAwardAchievements(req.user._id).catch(() => {});
    }
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update progress.' });
  }
};

// Story Like Controller
exports.toggleLikeStory = async (req, res) => {
  try {
    const storyId = req.params.storyId || req.params.id;
    const userId = req.user._id;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    const idx = story.likes.findIndex(id => id.toString() === userId.toString());
    const liked = idx === -1;
    if (liked) {
      story.likes.push(userId);
    } else {
      story.likes.splice(idx, 1);
    }
    story.likesCount = story.likes.length;
    await story.save();

    // Only update likesReceived + notify for OTHER users liking your story
    const isSelfLike = story.contributor.toString() === userId.toString();
    if (!isSelfLike) {
      const delta = liked ? 1 : -1;
      await User.findByIdAndUpdate(story.contributor, { $inc: { likesReceived: delta } });
      if (liked) {
        await Notification.create({
          recipient: story.contributor,
          sender: userId,
          type: 'like',
          title: 'Someone liked your story',
          message: `${req.user.name} liked your story "${story.title}".`,
          link: `/stories/${story.slug}`,
        });
      }
    }

    res.json({ success: true, liked, likesCount: story.likesCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle like.' });
  }
};