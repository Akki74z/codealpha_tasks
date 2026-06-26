const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.get('/me', authMiddleware, (req, res) => {
  db.users.findOne({ _id: req.user.id }, (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password, ...safe } = user;
    res.json(safe);
  });
});

router.get('/search', authMiddleware, (req, res) => {
  const q = req.query.q || '';
  db.users.find({ $or: [{ username: new RegExp(q, 'i') }, { fullName: new RegExp(q, 'i') }] }, (err, users) => {
    res.json(users.map(({ password, ...u }) => u));
  });
});

router.get('/', authMiddleware, (req, res) => {
  db.users.find({}, (err, users) => {
    res.json(users.map(({ password, ...u }) => u));
  });
});

module.exports = router;
