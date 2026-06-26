const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const COLORS = ['#6C63FF','#FF6584','#43D9AD','#FFB347','#4ECDC4','#FF6B6B','#A8E063','#45B7D1'];

router.post('/register', async (req, res) => {
  const { username, email, password, fullName } = req.body;
  if (!username || !email || !password || !fullName)
    return res.status(400).json({ error: 'All fields are required.' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = {
      _id: uuidv4(),
      username, email, fullName,
      password: hashed,
      avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
      avatarInitials: fullName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    db.users.insert(user, (err, newUser) => {
      if (err) return res.status(409).json({ error: 'Username or email already exists.' });
      const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...safe } = newUser;
      res.status(201).json({ token, user: safe });
    });
  } catch { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  db.users.findOne({ email }, async (err, user) => {
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safe } = user;
    res.json({ token, user: safe });
  });
});

module.exports = router;
