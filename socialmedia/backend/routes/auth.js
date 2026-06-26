const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, bio } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Username, email and password are required.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatarColors = ['#6C63FF','#FF6584','#43D9AD','#FFB347','#4ECDC4','#FF6B6B','#A8E063'];
    const color = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const user = {
      _id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      bio: bio || '',
      avatarColor: color,
      avatarInitials: username.slice(0, 2).toUpperCase(),
      createdAt: new Date().toISOString(),
    };

    db.users.insert(user, (err, newUser) => {
      if (err) {
        if (err.errorType === 'uniqueViolated') {
          return res.status(409).json({ error: 'Username or email already exists.' });
        }
        return res.status(500).json({ error: 'Failed to create user.' });
      }
      const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...safeUser } = newUser;
      res.status(201).json({ token, user: safeUser });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    db.users.findOne({ email }, async (err, user) => {
      if (err || !user) return res.status(401).json({ error: 'Invalid credentials.' });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

      const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...safeUser } = user;
      res.json({ token, user: safeUser });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
