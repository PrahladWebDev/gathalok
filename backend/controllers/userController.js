const mongoose = require('mongoose');
const User = require('../models/User');
const Story = require('../models/Story');
const { Follow, Notification } = require('../models/index');

const PUBLIC_FIELDS = 'name username avatar bio country role storiesWritten countriesExplored createdAt';
const LIST_FIELDS = 'name username avatar bio role';

// Only contributors (and admins) have public profiles and can be followed
const PROFILE_ROLES = ['contributor', 'admin'];

const findActiveUserByUsername = (username = '') =>
  User.findOne({ username: username.toLowerCase(), role: { $in: PROFILE_ROLES }, isActive: true, isBlocked: false });

const paging = (req, def = 20) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || def));
  return { page, limit, skip: (page - 1) * limit };
};

// ─── GET /users/:username  (public profile) ───────────────
exports.getPublicProfile = async (req, res) => {
  try {
    const user = await findActiveUserByUsername(req.params.username).select(PUBLIC_FIELDS);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const [followersCount, followingCount, publishedCount, likeAgg, followDoc] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      Story.countDocuments({ contributor: user._id, status: 'approved' }),
      // Likes received on approved stories, excluding self-likes
      Story.aggregate([
        { $match: { contributor: user._id, status: 'approved' } },
        { $group: {
            _id: null,
            total: { $sum: { $size: { $filter: {
              input: { $ifNull: ['$likes', []] },
              cond: { $ne: ['$$this', '$contributor'] },
            } } } },
        } },
      ]),
      req.user ? Follow.exists({ follower: req.user._id, following: user._id }) : null,
    ]);

    res.json({
      success: true,
      data: {
        ...user.toObject({ virtuals: true }),
        followersCount,
        followingCount,
        publishedCount,
        likesReceived: likeAgg[0]?.total || 0,
        isFollowing: !!followDoc,
        isSelf: !!req.user && req.user._id.equals(user._id),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
};

// ─── GET /users/:username/stories ─────────────────────────
exports.getUserStories = async (req, res) => {
  try {
    const user = await findActiveUserByUsername(req.params.username).select('_id');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const { page, limit, skip } = paging(req, 12);
    const query = { contributor: user._id, status: 'approved' };
    const [stories, total] = await Promise.all([
      Story.find(query)
        .select('-fullStory')
        .populate('contributor', 'name username avatar')
        .sort('-createdAt').skip(skip).limit(limit).lean(),
      Story.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: stories,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stories.' });
  }
};

// ─── Shared: followers / following lists ──────────────────
const buildList = async (req, res, direction) => {
  try {
    const user = await findActiveUserByUsername(req.params.username).select('_id');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const { page, limit, skip } = paging(req);
    const filter = direction === 'followers' ? { following: user._id } : { follower: user._id };
    const populateKey = direction === 'followers' ? 'follower' : 'following';

    const [rows, total] = await Promise.all([
      Follow.find(filter)
        .populate({ path: populateKey, select: LIST_FIELDS, match: { isActive: true, isBlocked: false } })
        .sort('-createdAt').skip(skip).limit(limit).lean(),
      Follow.countDocuments(filter),
    ]);

    const users = rows.map(r => r[populateKey]).filter(Boolean);

    // Mark which of these the *viewer* follows
    let followedIds = new Set();
    if (req.user && users.length) {
      const mine = await Follow.find({
        follower: req.user._id,
        following: { $in: users.map(u => u._id) },
      }).select('following').lean();
      followedIds = new Set(mine.map(m => m.following.toString()));
    }

    res.json({
      success: true,
      data: users.map(u => ({
        ...u,
        isFollowing: followedIds.has(u._id.toString()),
        isSelf: !!req.user && req.user._id.equals(u._id),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Failed to fetch ${direction}.` });
  }
};
exports.getFollowers = (req, res) => buildList(req, res, 'followers');
exports.getFollowing = (req, res) => buildList(req, res, 'following');

// ─── GET /users/:id/follow-status ─────────────────────────
exports.getFollowStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }
    const exists = await Follow.exists({ follower: req.user._id, following: req.params.id });
    res.json({ success: true, isFollowing: !!exists });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch follow status.' });
  }
};

// ─── POST /users/:id/follow ───────────────────────────────
exports.followUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }
    if (req.user._id.equals(id)) {
      return res.status(400).json({ success: false, message: "You can't follow yourself." });
    }
    const target = await User.findOne({ _id: id, role: { $in: PROFILE_ROLES }, isActive: true, isBlocked: false }).select('_id');
    if (!target) return res.status(404).json({ success: false, message: 'Only contributors can be followed.' });

    // Upsert keeps this idempotent; only notify on a genuinely new follow.
    const result = await Follow.updateOne(
      { follower: req.user._id, following: target._id },
      { $setOnInsert: { follower: req.user._id, following: target._id } },
      { upsert: true }
    );

    if (result.upsertedCount) {
      await Notification.create({
        recipient: target._id,
        sender: req.user._id,
        type: 'follow',
        title: 'New follower',
        message: `${req.user.name} started following you.`,
        link: `/u/${req.user.username}`,
      });
    }

    const followersCount = await Follow.countDocuments({ following: target._id });
    res.json({ success: true, isFollowing: true, followersCount, message: 'Following!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to follow user.' });
  }
};

// ─── DELETE /users/:id/follow ─────────────────────────────
exports.unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }
    await Follow.deleteOne({ follower: req.user._id, following: id });
    const followersCount = await Follow.countDocuments({ following: id });
    res.json({ success: true, isFollowing: false, followersCount, message: 'Unfollowed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unfollow user.' });
  }
};
