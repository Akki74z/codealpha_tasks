const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.get('/:taskId', authMiddleware, (req, res) => {
  db.comments.find({ taskId: req.params.taskId }).sort({ createdAt: 1 }).exec((err, comments) => {
    if (!comments.length) return res.json([]);
    let done = 0;
    comments.forEach((c, i) => {
      db.users.findOne({ _id: c.userId }, (err, user) => {
        comments[i].author = user ? { username: user.username, fullName: user.fullName, avatarColor: user.avatarColor, avatarInitials: user.avatarInitials } : {};
        done++;
        if (done === comments.length) res.json(comments);
      });
    });
  });
});

router.post('/:taskId', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required.' });

  db.tasks.findOne({ _id: req.params.taskId }, (err, task) => {
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    const comment = {
      _id: uuidv4(),
      taskId: req.params.taskId,
      projectId: task.projectId,
      userId: req.user.id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    db.comments.insert(comment, (err, newComment) => {
      if (err) return res.status(500).json({ error: 'Failed to add comment.' });
      db.users.findOne({ _id: req.user.id }, (err, user) => {
        const result = { ...newComment, author: user ? { username: user.username, fullName: user.fullName, avatarColor: user.avatarColor, avatarInitials: user.avatarInitials } : {} };
        req.app.locals.broadcast({ type: 'comment_added', comment: result });
        res.status(201).json(result);
      });
    });
  });
});

router.delete('/:id', authMiddleware, (req, res) => {
  db.comments.findOne({ _id: req.params.id, userId: req.user.id }, (err, comment) => {
    if (!comment) return res.status(403).json({ error: 'Not authorized.' });
    db.comments.remove({ _id: req.params.id }, {}, (err) => {
      req.app.locals.broadcast({ type: 'comment_deleted', commentId: req.params.id });
      res.json({ message: 'Comment deleted.' });
    });
  });
});

module.exports = router;
