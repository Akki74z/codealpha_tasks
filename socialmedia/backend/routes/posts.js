const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

function enrichPost(post, userId, cb) {
  db.users.findOne({ _id: post.userId }, (err, user) => {
    db.likes.count({ postId: post._id }, (err, likesCount) => {
      db.likes.findOne({ postId: post._id, userId }, (err, liked) => {
        db.comments.count({ postId: post._id }, (err, commentsCount) => {
          cb({
            ...post,
            author: user ? { username: user.username, avatarColor: user.avatarColor, avatarInitials: user.avatarInitials } : {},
            likesCount: likesCount || 0,
            commentsCount: commentsCount || 0,
            liked: !!liked,
          });
        });
      });
    });
  });
}

// Get feed (posts from followed users + own posts)
router.get('/feed', authMiddleware, (req, res) => {
  db.followers.find({ followerId: req.user.id }, (err, follows) => {
    const ids = [req.user.id, ...follows.map(f => f.followingId)];
    db.posts.find({ userId: { $in: ids } }).sort({ createdAt: -1 }).limit(50).exec((err, posts) => {
      if (err) return res.status(500).json({ error: 'Failed to load feed.' });
      let enriched = [];
      let count = 0;
      if (posts.length === 0) return res.json([]);
      posts.forEach(post => {
        enrichPost(post, req.user.id, (enrichedPost) => {
          enriched.push(enrichedPost);
          count++;
          if (count === posts.length) {
            enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            res.json(enriched);
          }
        });
      });
    });
  });
});

// Get all posts (explore/discover)
router.get('/explore', authMiddleware, (req, res) => {
  db.posts.find({}).sort({ createdAt: -1 }).limit(50).exec((err, posts) => {
    if (err) return res.status(500).json({ error: 'Failed to load posts.' });
    if (posts.length === 0) return res.json([]);
    let enriched = [];
    let count = 0;
    posts.forEach(post => {
      enrichPost(post, req.user.id, (enrichedPost) => {
        enriched.push(enrichedPost);
        count++;
        if (count === posts.length) {
          enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          res.json(enriched);
        }
      });
    });
  });
});

// Get posts by user
router.get('/user/:username', authMiddleware, (req, res) => {
  db.users.findOne({ username: req.params.username }, (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found.' });
    db.posts.find({ userId: user._id }).sort({ createdAt: -1 }).exec((err, posts) => {
      if (err) return res.status(500).json({ error: 'Failed to load posts.' });
      if (posts.length === 0) return res.json([]);
      let enriched = [];
      let count = 0;
      posts.forEach(post => {
        enrichPost(post, req.user.id, (enrichedPost) => {
          enriched.push(enrichedPost);
          count++;
          if (count === posts.length) {
            enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            res.json(enriched);
          }
        });
      });
    });
  });
});

// Create post
router.post('/', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Post content is required.' });

  const post = {
    _id: uuidv4(),
    userId: req.user.id,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  db.posts.insert(post, (err, newPost) => {
    if (err) return res.status(500).json({ error: 'Failed to create post.' });
    enrichPost(newPost, req.user.id, (enrichedPost) => res.status(201).json(enrichedPost));
  });
});

// Delete post
router.delete('/:id', authMiddleware, (req, res) => {
  db.posts.findOne({ _id: req.params.id }, (err, post) => {
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });
    db.posts.remove({ _id: req.params.id }, {}, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to delete post.' });
      db.comments.remove({ postId: req.params.id }, { multi: true }, () => {});
      db.likes.remove({ postId: req.params.id }, { multi: true }, () => {});
      res.json({ message: 'Post deleted.' });
    });
  });
});

// Like / Unlike
router.post('/:id/like', authMiddleware, (req, res) => {
  const postId = req.params.id;
  db.likes.findOne({ postId, userId: req.user.id }, (err, existing) => {
    if (existing) {
      db.likes.remove({ _id: existing._id }, {}, (err) => {
        db.likes.count({ postId }, (err, count) => res.json({ liked: false, likesCount: count }));
      });
    } else {
      db.likes.insert({ _id: uuidv4(), postId, userId: req.user.id, createdAt: new Date().toISOString() }, (err) => {
        db.likes.count({ postId }, (err, count) => res.json({ liked: true, likesCount: count }));
      });
    }
  });
});

module.exports = router;
