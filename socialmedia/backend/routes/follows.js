const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

// Follow / Unfollow a user
router.post('/:userId', authMiddleware, (req, res) => {
  const followingId = req.params.userId;
  const followerId = req.user.id;

  if (followerId === followingId) return res.status(400).json({ error: 'Cannot follow yourself.' });

  db.followers.findOne({ followerId, followingId }, (err, existing) => {
    if (existing) {
      db.followers.remove({ _id: existing._id }, {}, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to unfollow.' });
        db.followers.count({ followingId }, (err, count) => res.json({ following: false, followersCount: count }));
      });
    } else {
      db.followers.insert({ _id: uuidv4(), followerId, followingId, createdAt: new Date().toISOString() }, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to follow.' });
        db.followers.count({ followingId }, (err, count) => res.json({ following: true, followersCount: count }));
      });
    }
  });
});

// Get followers of a user
router.get('/:userId/followers', authMiddleware, (req, res) => {
  db.followers.find({ followingId: req.params.userId }, (err, records) => {
    if (err) return res.status(500).json({ error: 'Failed to load followers.' });
    const ids = records.map(r => r.followerId);
    db.users.find({ _id: { $in: ids } }, (err, users) => {
      const safe = users.map(({ password, ...u }) => u);
      res.json(safe);
    });
  });
});

// Get users that a user is following
router.get('/:userId/following', authMiddleware, (req, res) => {
  db.followers.find({ followerId: req.params.userId }, (err, records) => {
    if (err) return res.status(500).json({ error: 'Failed to load following.' });
    const ids = records.map(r => r.followingId);
    db.users.find({ _id: { $in: ids } }, (err, users) => {
      const safe = users.map(({ password, ...u }) => u);
      res.json(safe);
    });
  });
});

module.exports = router;
