// Achievement auto-unlock utility
const { Achievement, Notification } = require('../models/index');
const User = require('../models/User');

/**
 * Check and award achievements for a user based on their current stats.
 * Call after: reading a story, writing/approving a story, receiving a like.
 */
const checkAndAwardAchievements = async (userId) => {
  try {
    const user = await User.findById(userId).populate('achievements.achievementId');
    if (!user) return;

    const allAchievements = await Achievement.find({});
    const unlockedKeys = new Set(
      user.achievements.map(a => a.achievementId?.key || a.achievementId?.toString())
    );

    const stats = {
      stories_read:       user.storiesRead || 0,
      stories_written:    user.storiesWritten || 0,
      countries_explored: user.countriesExplored?.length || 0,
      likes_received:     user.totalLikesReceived || 0,
    };

    const toUnlock = allAchievements.filter(ach => {
      if (unlockedKeys.has(ach.key)) return false;
      if (!ach.condition?.type || !ach.condition?.threshold) return false;
      return stats[ach.condition.type] >= ach.condition.threshold;
    });

    if (toUnlock.length === 0) return;

    const newEntries = toUnlock.map(ach => ({ achievementId: ach._id, unlockedAt: new Date() }));
    await User.findByIdAndUpdate(userId, {
      $push: { achievements: { $each: newEntries } },
      $inc: { xp: toUnlock.reduce((s, a) => s + (a.xpValue || 0), 0) },
    });

    const notifications = toUnlock.map(ach => ({
      recipient: userId,
      type: 'achievement',
      title: `🏆 Achievement Unlocked: ${ach.title}`,
      message: `${ach.description} (+${ach.xpValue} XP)`,
      link: '/profile',
    }));
    await Notification.insertMany(notifications);

  } catch (err) {
    console.error('Achievement check error:', err.message);
  }
};

module.exports = { checkAndAwardAchievements };
