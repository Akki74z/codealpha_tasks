const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const commentRoutes = require('./routes/comments');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket broadcast helper
app.locals.broadcast = (data) => {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
};

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', message: 'Real-time updates active' }));
  ws.on('error', () => {});
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Project Management Tool running at http://localhost:${PORT}`);
});
