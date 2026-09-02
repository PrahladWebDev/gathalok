const Story = require('../models/Story');
const { Rating, Bookmark, ReadingHistory, Notification, Report } = require('../models/index');
const User = require('../models/User');
const { checkAndAwardAchievements } = require('../utils/achievements');

// ─── Helper: compute & update story rating ────────────────
const updateStoryRating = async (storyId) => {
  const ratings = await Rating.find({ story: storyId });
  if (!ratings.length) return;
  const avg = ratings.reduce((s, r) => s + r.value, 0) / ratings.length;
  await Story.findByIdAndUpdate(storyId, {
    averageRating: Math.round(avg * 10) / 10,
    totalRatings: ratings.length,
  });
};

// ─── GET /stories  ────────────────────────────────────────
exports.getStories = async (req, res) => {
  try {
    const {
      page = 1, limit = 12, country, category, status = 'approved',
      search, sort = '-createdAt', featured, tag,
    } = req.query;

    const query = {};

    // Public only sees approved unless admin/contributor checking own
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin) {
      if (status === 'all' && req.user) {
        // contributor viewing all their own stories (any status)
        query.contributor = req.user._id;
      } else if (status === 'approved') {
        query.status = 'approved';
      } else if (req.user && status) {
        query.status = status;
        query.contributor = req.user._id;
      } else {
        query.status = 'approved';
      }
    } else if (status && status !== 'all') {
      query.status = status;
    }

    if (country)  query.country = country;
    if (category) query.category = category;
    if (featured) query.isFeatured = true;
    if (tag)      query.tags = tag.toLowerCase();

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { title: regex },
        { shortDescription: regex },
        { tags: regex },
        { alternativeNames: regex },
        { country: regex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = sort.startsWith('-')
      ? { [sort.slice(1)]: -1 }
      : { [sort]: 1 };

    const [stories, total] = await Promise.all([
      Story.find(query)
        .populate('contributor', 'name username avatar')
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Story.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: stories,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stories.' });
  }
};

// ─── GET /stories/:slug ───────────────────────────────────
exports.getStory = async (req, res) => {
  try {
    const { slug } = req.params;
    const story = await Story.findOne({ slug })
      .populate('contributor', 'name username avatar bio')
      .populate('reviewedBy', 'name username');

    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    // Only show non-approved to admin or owner
    if (story.status !== 'approved') {
      const isAdmin = req.user?.role === 'admin';
      const isOwner = req.user?._id.toString() === story.contributor._id.toString();
      if (!isAdmin && !isOwner) {
        return res.status(404).json({ success: false, message: 'Story not found.' });
      }
    }

    // Increment view count
    await Story.findByIdAndUpdate(story._id, { $inc: { views: 1 } });

    // Track reading history if logged in
    if (req.user) {
      // Atomic upsert — $setOnInsert only runs when a new doc is created
      const historyResult = await ReadingHistory.collection.updateOne(
        { user: req.user._id, story: story._id },
        {
          $set: { readAt: new Date() },
          $setOnInsert: { timeSpent: 0, completed: false },
        },
        { upsert: true }
      );

      // upsertedCount === 1 means first-ever read, guaranteed atomic
      if (historyResult.upsertedCount === 1) {
        await User.findByIdAndUpdate(req.user._id, { $inc: { storiesRead: 1 } });
        checkAndAwardAchievements(req.user._id).catch(() => {});
      }

      // Track country exploration
      if (!req.user.countriesExplored.includes(story.country)) {
        await User.findByIdAndUpdate(req.user._id, {
          $addToSet: { countriesExplored: story.country },
        });
      }
    }

    // Related stories
    const related = await Story.find({
      status: 'approved',
      _id: { $ne: story._id },
      $or: [{ country: story.country }, { category: story.category }],
    })
      .select('title slug coverImage country category averageRating views')
      .limit(4)
      .lean();

    res.json({ success: true, data: { ...story.toObject(), related } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch story.' });
  }
};

// ─── GET /stories/id/:id (for editing by contributors) ───
exports.getStoryById = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('contributor', 'name username avatar bio')
      .populate('reviewedBy', 'name username');

    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    // Only owner or admin can fetch by ID (used for edit page)
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?._id.toString() === story.contributor._id.toString();
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    res.json({ success: true, data: story });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch story.' });
  }
};

// ─── POST /stories ────────────────────────────────────────
exports.createStory = async (req, res) => {
  try {
    const {
      title, alternativeNames, country, category,
      shortDescription, fullStory, origin, significance,
      tags, references, coverImage, status,
    } = req.body;

    const isDraft = status === 'draft';

    // references comes as string[] from frontend — coerce to [{title, url}] the model expects
    const normalizedReferences = Array.isArray(references)
      ? references
          .map(r => (typeof r === 'string' ? { title: r, url: '' } : r))
          .filter(r => r.title || r.url)
      : [];

    const storyData = {
      title,
      alternativeNames: alternativeNames || [],
      country,
      category,
      shortDescription,
      fullStory,
      origin: origin || '',
      significance: significance || '',
      coverImage: coverImage || {},
      tags: tags || [],
      references: normalizedReferences,
      contributor: req.user._id,
      // Admin stories go live immediately, others go to pending review
      status: isDraft ? 'draft' : req.user.role === 'admin' ? 'approved' : 'pending',
    };

    const story = await Story.create(storyData);

    // If the story is published immediately (admin direct publish), credit the
    // contributor's storiesWritten count right away — reviewStory() only handles
    // the case where a pending story gets approved later.
    if (storyData.status === 'approved') {
      await User.findByIdAndUpdate(req.user._id, { $inc: { storiesWritten: 1 } });
      checkAndAwardAchievements(req.user._id).catch(() => {});
    }

    if (!isDraft) {
      // Notify admins
      const admins = await User.find({ role: 'admin' }, '_id');
      const notifications = admins.map(admin => ({
        recipient: admin._id,
        sender: req.user._id,
        type: 'story_approved', // reuse, or you could add 'story_submitted'
        title: 'New Story Submitted',
        message: `${req.user.name} submitted "${title}" for review.`,
        link: `/admin?tab=pending`,
      }));
      if (notifications.length) {
        const { Notification } = require('../models/index');
        await Notification.insertMany(notifications);
      }
    }

    res.status(201).json({ success: true, message: isDraft ? 'Draft saved.' : 'Story submitted for review.', data: story });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create story.' });
  }
};

// ─── PUT /stories/:id ─────────────────────────────────────
exports.updateStory = async (req, res) => {
  try {
    let story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    const isOwner = story.contributor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this story.' });
    }

    // Owner can edit draft/rejected/changes_requested/approved stories (editing an
    // approved story re-queues it for review below); pending stories are locked
    // while an admin is actively reviewing them.
    if (isOwner && !isAdmin) {
      if (story.status === 'pending') {
        return res.status(400).json({ success: false, message: 'Cannot edit a story that is currently pending review.' });
      }
    }

    // Whitelist only editable fields — never allow slug, _id, stats, or timestamps through
    const {
      title, alternativeNames, country,
      category, shortDescription, fullStory,
      origin, significance, tags, coverImage, status,
    } = req.body;

    const updates = {};
    if (title !== undefined)            updates.title            = title;
    if (alternativeNames !== undefined) updates.alternativeNames = alternativeNames;
    if (country !== undefined)          updates.country          = country;
    if (category !== undefined)         updates.category         = category;
    if (shortDescription !== undefined) updates.shortDescription = shortDescription;
    if (fullStory !== undefined)        updates.fullStory        = fullStory;
    if (origin !== undefined)           updates.origin           = origin;
    if (significance !== undefined)     updates.significance     = significance;
    if (tags !== undefined)             updates.tags             = tags;
    if (coverImage !== undefined)       updates.coverImage       = coverImage;

    // references comes as string[] from frontend — coerce to [{title, url}] the model expects
    if (req.body.references !== undefined) {
      const refs = req.body.references;
      if (Array.isArray(refs)) {
        updates.references = refs
          .map(r => typeof r === 'string' ? { title: r, url: '' } : r)
          .filter(r => r.title || r.url);
      } else {
        updates.references = [];
      }
    }

    // Allow contributor to re-submit (pending) or save draft
    if (status === 'pending' || status === 'draft') {
      updates.status = status;
    }

    story = await Story.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('contributor', 'name username avatar');

    // Notify all admins when contributor resubmits for review
    if (updates.status === 'pending') {
      const admins = await User.find({ role: 'admin' }, '_id');
      const notifications = admins.map(admin => ({
        recipient: admin._id,
        sender: req.user._id,
        type: 'story_resubmitted',
        title: 'Story Resubmitted for Review',
        message: `${req.user.name} resubmitted "${story.title}" for review.`,
        link: `/admin?tab=pending`,
      }));
      if (notifications.length) {
        await Notification.insertMany(notifications);
      }
    }

    res.json({ success: true, message: 'Story updated.', data: story });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update story.' });
  }
};

// ─── DELETE /stories/:id ──────────────────────────────────
exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    const isOwner = story.contributor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    await story.deleteOne();
    // Cascade deletes
    await Promise.all([
      Rating.deleteMany({ story: story._id }),
      Bookmark.deleteMany({ story: story._id }),
      ReadingHistory.deleteMany({ story: story._id }),
    ]);

    res.json({ success: true, message: 'Story deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete story.' });
  }
};

// ─── PATCH /stories/:id/review (admin) ───────────────────
exports.reviewStory = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const validStatuses = ['approved', 'rejected', 'changes_requested'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { status, adminNote: adminNote || '', reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    ).populate('contributor', 'name _id');

    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    // Update contributor's story count
    if (status === 'approved') {
      await User.findByIdAndUpdate(story.contributor._id, { $inc: { storiesWritten: 1 } });
      checkAndAwardAchievements(story.contributor._id).catch(() => {});
    }

    // Notify contributor
    const messages = {
      approved: `🎉 Your story "${story.title}" has been approved and is now live!`,
      rejected: `Your story "${story.title}" was rejected. ${adminNote ? 'Reason: ' + adminNote : ''}`,
      changes_requested: `Changes requested for "${story.title}". ${adminNote || ''}`,
    };

    await Notification.create({
      recipient: story.contributor._id,
      sender: req.user._id,
      type: status === 'changes_requested' ? 'story_changes' : `story_${status}`,
      title: status === 'approved' ? 'Story Approved!' : status === 'rejected' ? 'Story Rejected' : 'Changes Requested',
      message: messages[status],
      link: `/stories/${story.slug}`,
    });

    res.json({ success: true, message: `Story ${status}.`, data: story });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Review failed.' });
  }
};

// ─── GET /stories/trending ────────────────────────────────
exports.getTrending = async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stories = await Story.find({ status: 'approved', updatedAt: { $gte: since } })
      .populate('contributor', 'name username avatar')
      .sort('-views -averageRating')
      .limit(8)
      .lean();
    res.json({ success: true, data: stories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch trending.' });
  }
};

// ─── GET /stories/featured ────────────────────────────────
exports.getFeatured = async (req, res) => {
  try {
    const stories = await Story.find({ status: 'approved', isFeatured: true })
      .populate('contributor', 'name username avatar')
      .sort('-views')
      .limit(5)
      .lean();
    res.json({ success: true, data: stories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch featured.' });
  }
};

// ─── POST /stories/report ─────────────────────────────────
exports.reportContent = async (req, res) => {
  try {
    const { targetId, targetType, reason, description } = req.body;
    if (!targetId || !targetType || !reason) {
      return res.status(400).json({ success: false, message: 'targetId, targetType, and reason are required.' });
    }
    const existing = await Report.findOne({ reporter: req.user._id, targetId, targetType });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already reported this content.' });
    }
    await Report.create({ reporter: req.user._id, targetId, targetType, reason, description: description || '' });
    res.status(201).json({ success: true, message: 'Report submitted. Thank you!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
};
