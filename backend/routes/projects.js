const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const PROJECT_COLORS = ['#6C63FF','#FF6584','#43D9AD','#FFB347','#4ECDC4','#45B7D1','#FF6B6B'];

// Get all projects for current user
router.get('/', authMiddleware, (req, res) => {
  db.members.find({ userId: req.user.id }, (err, memberships) => {
    const projectIds = memberships.map(m => m.projectId);
    db.projects.find({ $or: [{ ownerId: req.user.id }, { _id: { $in: projectIds } }] })
      .sort({ createdAt: -1 }).exec((err, projects) => {
        if (err) return res.status(500).json({ error: 'Failed to load projects.' });
        // Attach member counts
        let done = 0;
        if (projects.length === 0) return res.json([]);
        projects.forEach((proj, i) => {
          db.members.count({ projectId: proj._id }, (err, count) => {
            projects[i].memberCount = (count || 0) + 1;
            db.tasks.count({ projectId: proj._id }, (err, tc) => {
              projects[i].taskCount = tc || 0;
              done++;
              if (done === projects.length) res.json(projects);
            });
          });
        });
      });
  });
});

// Get single project with members
router.get('/:id', authMiddleware, (req, res) => {
  db.projects.findOne({ _id: req.params.id }, (err, project) => {
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    db.members.find({ projectId: project._id }, (err, memberRecords) => {
      const memberIds = [project.ownerId, ...memberRecords.map(m => m.userId)];
      db.users.find({ _id: { $in: memberIds } }, (err, users) => {
        const safeUsers = users.map(({ password, ...u }) => u);
        res.json({ ...project, members: safeUsers });
      });
    });
  });
});

// Create project
router.post('/', authMiddleware, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required.' });

  const project = {
    _id: uuidv4(),
    name, description: description || '',
    ownerId: req.user.id,
    color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
    createdAt: new Date().toISOString(),
  };

  db.projects.insert(project, (err, newProject) => {
    if (err) return res.status(500).json({ error: 'Failed to create project.' });
    req.app.locals.broadcast({ type: 'project_created', project: newProject });
    res.status(201).json(newProject);
  });
});

// Update project
router.put('/:id', authMiddleware, (req, res) => {
  db.projects.findOne({ _id: req.params.id, ownerId: req.user.id }, (err, project) => {
    if (!project) return res.status(403).json({ error: 'Not authorized.' });
    const { name, description } = req.body;
    db.projects.update({ _id: req.params.id }, { $set: { name, description } }, {}, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update.' });
      db.projects.findOne({ _id: req.params.id }, (err, updated) => res.json(updated));
    });
  });
});

// Delete project
router.delete('/:id', authMiddleware, (req, res) => {
  db.projects.findOne({ _id: req.params.id, ownerId: req.user.id }, (err, project) => {
    if (!project) return res.status(403).json({ error: 'Not authorized.' });
    db.projects.remove({ _id: req.params.id }, {}, () => {
      db.tasks.remove({ projectId: req.params.id }, { multi: true }, () => {});
      db.members.remove({ projectId: req.params.id }, { multi: true }, () => {});
      req.app.locals.broadcast({ type: 'project_deleted', projectId: req.params.id });
      res.json({ message: 'Project deleted.' });
    });
  });
});

// Add member
router.post('/:id/members', authMiddleware, (req, res) => {
  const { userId } = req.body;
  db.projects.findOne({ _id: req.params.id, ownerId: req.user.id }, (err, project) => {
    if (!project) return res.status(403).json({ error: 'Not authorized.' });
    db.members.findOne({ projectId: req.params.id, userId }, (err, existing) => {
      if (existing) return res.status(409).json({ error: 'Already a member.' });
      if (userId === req.user.id) return res.status(400).json({ error: 'You are the owner.' });
      db.members.insert({ _id: uuidv4(), projectId: req.params.id, userId, joinedAt: new Date().toISOString() }, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to add member.' });
        req.app.locals.broadcast({ type: 'member_added', projectId: req.params.id, userId });
        res.status(201).json({ message: 'Member added.' });
      });
    });
  });
});

// Remove member
router.delete('/:id/members/:userId', authMiddleware, (req, res) => {
  db.projects.findOne({ _id: req.params.id, ownerId: req.user.id }, (err, project) => {
    if (!project) return res.status(403).json({ error: 'Not authorized.' });
    db.members.remove({ projectId: req.params.id, userId: req.params.userId }, {}, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to remove member.' });
      res.json({ message: 'Member removed.' });
    });
  });
});

module.exports = router;
