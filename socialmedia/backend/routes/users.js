const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

// Get current user profile
router.get('/me', authMiddleware, (req, res) => {
  db.users.findOne({ _id: req.user.id }, (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found.' });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });
});

// Get user by username
router.get('/:username', authMiddleware, (req, res) => {
  db.users.findOne({ username: req.params.username }, (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found.' });
    const { password, ...safeUser } = user;

    // Get follower/following counts
    db.followers.count({ followingId: user._id }, (err, followersCount) => {
      db.followers.count({ followerId: user._id }, (err, followingCount) => {
        db.posts.count({ userId: user._id }, (err, postsCount) => {
          // Check if current user follows this profile
          db.followers.findOne({ followerId: req.user.id, followingId: user._id }, (err, followRecord) => {
            res.json({
              ...safeUser,
              followersCount: followersCount || 0,
              followingCount: followingCount || 0,
              postsCount: postsCount || 0,
              isFollowing: !!followRecord,
            });
          });
        });
      });
    });
  });
});

// Update profile
router.put('/me', authMiddleware, (req, res) => {
  const { bio } = req.body;
  db.users.update({ _id: req.user.id }, { $set: { bio } }, {}, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to update profile.' });
    db.users.findOne({ _id: req.user.id }, (err, user) => {
      const { password, ...safeUser } = user;
      res.json(safeUser);
    });
  });
});

// Search users
router.get('/', authMiddleware, (req, res) => {
  const query = req.query.q || '';
  db.users.find({ username: new RegExp(query, 'i') }, (err, users) => {
    if (err) return res.status(500).json({ error: 'Search failed.' });
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  });
});

module.exports = router;
