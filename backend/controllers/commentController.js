// controllers/commentController.js
const Comment = require('../models/Comment');
const Story = require('../models/Story');
const { Notification } = require('../models/index');

exports.getComments = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { page = 1, limit = 20, parent = null } = req.query;
    const query = { story: storyId, parent: parent || null, isHidden: false };
    const skip = (Number(page) - 1) * Number(limit);

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('author', 'name username avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Comment.countDocuments(query),
    ]);

    res.json({ success: true, data: comments, pagination: { page: Number(page), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch comments.' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { content, parent } = req.body;
    const { storyId } = req.params;

    const story = await Story.findById(storyId).populate('contributor', '_id name');
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    const comment = await Comment.create({ story: storyId, author: req.user._id, content, parent: parent || null });
    await comment.populate('author', 'name username avatar');

    // Increment comment count on story
    await Story.findByIdAndUpdate(storyId, { $inc: { totalComments: 1 } });

    // Increment reply count on parent
    if (parent) await Comment.findByIdAndUpdate(parent, { $inc: { replyCount: 1 } });

    // Notify story author (if not self)
    if (story.contributor._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: story.contributor._id,
        sender: req.user._id,
        type: parent ? 'reply' : 'comment',
        title: parent ? 'New reply on your story' : 'New comment on your story',
        message: `${req.user.name} ${parent ? 'replied to a comment on' : 'commented on'} "${story.title}": "${content.slice(0, 80)}"`,
        link: `/stories/${story.slug}`,
      });
    }

    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to post comment.' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    const userId = req.user._id.toString();
    const idx = comment.likes.findIndex(l => l.toString() === userId);
    if (idx === -1) comment.likes.push(req.user._id);
    else comment.likes.splice(idx, 1);
    await comment.save();
    res.json({ success: true, likeCount: comment.likeCount, liked: idx === -1 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle like.' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    const isOwner = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Not authorized.' });
    await comment.deleteOne();
    await Story.findByIdAndUpdate(comment.story, { $inc: { totalComments: -1 } });
    res.json({ success: true, message: 'Comment deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete comment.' });
  }
};
