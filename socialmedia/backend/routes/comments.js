const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

// Get comments for a post
router.get('/:postId', authMiddleware, (req, res) => {
  db.comments.find({ postId: req.params.postId }).sort({ createdAt: 1 }).exec((err, comments) => {
    if (err) return res.status(500).json({ error: 'Failed to load comments.' });
    if (comments.length === 0) return res.json([]);

    let enriched = [];
    let count = 0;
    comments.forEach(comment => {
      db.users.findOne({ _id: comment.userId }, (err, user) => {
        enriched.push({
          ...comment,
          author: user ? { username: user.username, avatarColor: user.avatarColor, avatarInitials: user.avatarInitials } : {},
        });
        count++;
        if (count === comments.length) {
          enriched.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          res.json(enriched);
        }
      });
    });
  });
});

// Add a comment
router.post('/:postId', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content is required.' });

  const comment = {
    _id: uuidv4(),
    postId: req.params.postId,
    userId: req.user.id,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  db.comments.insert(comment, (err, newComment) => {
    if (err) return res.status(500).json({ error: 'Failed to add comment.' });
    db.users.findOne({ _id: req.user.id }, (err, user) => {
      res.status(201).json({
        ...newComment,
        author: user ? { username: user.username, avatarColor: user.avatarColor, avatarInitials: user.avatarInitials } : {},
      });
    });
  });
});

// Delete a comment
router.delete('/:id', authMiddleware, (req, res) => {
  db.comments.findOne({ _id: req.params.id }, (err, comment) => {
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });
    if (comment.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });
    db.comments.remove({ _id: req.params.id }, {}, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to delete comment.' });
      res.json({ message: 'Comment deleted.' });
    });
  });
});

module.exports = router;
