const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const STATUSES = ['todo', 'inprogress', 'review', 'done'];

function isMember(projectId, userId, cb) {
  db.projects.findOne({ _id: projectId }, (err, project) => {
    if (!project) return cb(false);
    if (project.ownerId === userId) return cb(true);
    db.members.findOne({ projectId, userId }, (err, m) => cb(!!m));
  });
}

// Get all tasks for a project
router.get('/project/:projectId', authMiddleware, (req, res) => {
  isMember(req.params.projectId, req.user.id, (ok) => {
    if (!ok) return res.status(403).json({ error: 'Not a member of this project.' });
    db.tasks.find({ projectId: req.params.projectId }).sort({ createdAt: 1 }).exec((err, tasks) => {
      if (err) return res.status(500).json({ error: 'Failed to load tasks.' });
      if (tasks.length === 0) return res.json([]);
      let done = 0;
      tasks.forEach((task, i) => {
        db.comments.count({ taskId: task._id }, (err, count) => {
          tasks[i].commentCount = count || 0;
          // Attach assignee info
          if (task.assigneeId) {
            db.users.findOne({ _id: task.assigneeId }, (err, u) => {
              tasks[i].assignee = u ? { username: u.username, avatarColor: u.avatarColor, avatarInitials: u.avatarInitials, fullName: u.fullName } : null;
              done++;
              if (done === tasks.length) res.json(tasks);
            });
          } else {
            tasks[i].assignee = null;
            done++;
            if (done === tasks.length) res.json(tasks);
          }
        });
      });
    });
  });
});

// Create task
router.post('/', authMiddleware, (req, res) => {
  const { projectId, title, description, status, priority, assigneeId, dueDate } = req.body;
  if (!projectId || !title) return res.status(400).json({ error: 'Project and title are required.' });

  isMember(projectId, req.user.id, (ok) => {
    if (!ok) return res.status(403).json({ error: 'Not a member.' });
    const task = {
      _id: uuidv4(),
      projectId, title,
      description: description || '',
      status: STATUSES.includes(status) ? status : 'todo',
      priority: priority || 'medium',
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
    };
    db.tasks.insert(task, (err, newTask) => {
      if (err) return res.status(500).json({ error: 'Failed to create task.' });
      req.app.locals.broadcast({ type: 'task_created', task: newTask });
      res.status(201).json(newTask);
    });
  });
});

// Update task (title, description, status, priority, assignee, dueDate)
router.put('/:id', authMiddleware, (req, res) => {
  db.tasks.findOne({ _id: req.params.id }, (err, task) => {
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    isMember(task.projectId, req.user.id, (ok) => {
      if (!ok) return res.status(403).json({ error: 'Not a member.' });
      const allowed = ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate'];
      const updates = {};
      allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
      db.tasks.update({ _id: req.params.id }, { $set: updates }, {}, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update task.' });
        db.tasks.findOne({ _id: req.params.id }, (err, updated) => {
          req.app.locals.broadcast({ type: 'task_updated', task: updated });
          res.json(updated);
        });
      });
    });
  });
});

// Delete task
router.delete('/:id', authMiddleware, (req, res) => {
  db.tasks.findOne({ _id: req.params.id }, (err, task) => {
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    isMember(task.projectId, req.user.id, (ok) => {
      if (!ok) return res.status(403).json({ error: 'Not a member.' });
      db.tasks.remove({ _id: req.params.id }, {}, () => {
        db.comments.remove({ taskId: req.params.id }, { multi: true }, () => {});
        req.app.locals.broadcast({ type: 'task_deleted', taskId: req.params.id, projectId: task.projectId });
        res.json({ message: 'Task deleted.' });
      });
    });
  });
});

module.exports = router;
