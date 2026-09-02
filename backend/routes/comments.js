// This file exports several routers for different features
// Each is saved as a separate file in the routes/ folder

// routes/comments.js
const express = require('express');
const commentRouter = express.Router({ mergeParams: true });
const { protect, optionalAuth } = require('../middleware/auth');
const { getComments, createComment, toggleLike, deleteComment } = require('../controllers/commentController');

commentRouter.get('/',         optionalAuth, getComments);
commentRouter.post('/',        protect, createComment);
commentRouter.patch('/:id/like', protect, toggleLike);
commentRouter.delete('/:id',   protect, deleteComment);

module.exports = commentRouter;
