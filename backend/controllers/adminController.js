const User = require('../models/User');
const Story = require('../models/Story');
const { Notification, Report, Achievement } = require('../models/index');
const { getCategory } = require('../utils/categories');

// ─── Admin Analytics ──────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const [
      totalUsers, totalStories, totalApproved, totalPending,
      topStory, topCountry, topCategory, topContributor,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Story.countDocuments(),
      Story.countDocuments({ status: 'approved' }),
      Story.countDocuments({ status: 'pending' }),
      Story.findOne({ status: 'approved' }).sort('-views').select('title slug views'),
      Story.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      Story.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      User.find({ role: { $in: ['contributor', 'admin'] } })
        .sort('-storiesWritten')
        .select('name username avatar storiesWritten')
        .limit(1),
    ]);

    const totalViews = await Story.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalStories,
        totalApproved,
        totalPending,
        totalViews: totalViews[0]?.total || 0,
        topStory,
        topCountry: topCountry[0]?._id || 'N/A',
        topCategory: getCategory(topCategory[0]?._id)?.name || 'N/A',
        topContributor: topContributor[0] || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics.' });
  }
};

// ─── Admin: Manage Users ──────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, blocked } = req.query;
    const query = {};
    if (role) query.role = role;
    if (blocked === 'true') query.isBlocked = true;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort('-createdAt').skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);
    res.json({ success: true, data: users, pagination: { page: Number(page), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'contributor', 'admin'];
    if (!validRoles.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: `Role updated to ${role}.`, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update role.' });
  }
};

exports.toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot block an admin.' });
    user.isBlocked = !user.isBlocked;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: user.isBlocked ? 'User blocked.' : 'User unblocked.', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle block.' });
  }
};

// ─── Admin: Feature Story ─────────────────────────────────
exports.featureStory = async (req, res) => {
  try {
    const { featured, featuredUntil } = req.body;
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { isFeatured: !!featured, featuredUntil: featuredUntil ? new Date(featuredUntil) : null },
      { new: true }
    );
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });
    res.json({ success: true, message: featured ? 'Story featured.' : 'Story unfeatured.', data: story });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to feature story.' });
  }
};

// ─── Admin: Broadcast Notification ───────────────────────
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, link } = req.body;
    const users = await User.find({ isActive: true, isBlocked: false }, '_id');
    const notifications = users.map(u => ({
      recipient: u._id,
      sender: req.user._id,
      type: 'announcement',
      title,
      message,
      link: link || '/',
    }));
    await Notification.insertMany(notifications, { ordered: false });
    res.json({ success: true, message: `Notification sent to ${users.length} users.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to broadcast.' });
  }
};

// ─── Reports ──────────────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find({ status: 'pending' })
      .populate('reporter', 'name username')
      .populate({ path: 'targetId', select: 'slug title', model: Story })
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reports.' });
  }
};

exports.updateReport = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update report.' });
  }
};

// ─── Leaderboard ──────────────────────────────────────────
exports.getLeaderboard = async (req, res) => {
  try {
    const [topReaders, topContributors, topStories] = await Promise.all([
      User.find({ isActive: true, isBlocked: false })
        .sort('-storiesRead')
        .limit(10)
        .select('name username avatar storiesRead countriesExplored'),
      User.find({ role: { $in: ['contributor', 'admin'] }, isActive: true, isBlocked: false })
        .sort('-storiesWritten')
        .limit(10)
        .select('name username avatar storiesWritten totalLikesReceived'),
      Story.find({ status: 'approved' })
        .sort('-views')
        .limit(10)
        .select('title slug coverImage views averageRating country category'),
    ]);
    res.json({ success: true, data: { topReaders, topContributors, topStories } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard.' });
  }
};

// ─── Country Stats ────────────────────────────────────────
exports.getCountryStats = async (req, res) => {
  try {
    const stats = await Story.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$country',
          storyCount: { $sum: 1 },
          totalViews: { $sum: '$views' },
          avgRating: { $avg: '$averageRating' },
        },
      },
      { $sort: { storyCount: -1 } },
    ]);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch country stats.' });
  }
};
