const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

const db = {
  users:    new Datastore({ filename: path.join(dbPath, 'users.db'),    autoload: true }),
  projects: new Datastore({ filename: path.join(dbPath, 'projects.db'), autoload: true }),
  tasks:    new Datastore({ filename: path.join(dbPath, 'tasks.db'),    autoload: true }),
  comments: new Datastore({ filename: path.join(dbPath, 'comments.db'), autoload: true }),
  members:  new Datastore({ filename: path.join(dbPath, 'members.db'),  autoload: true }),
};

db.users.ensureIndex({ fieldName: 'username', unique: true });
db.users.ensureIndex({ fieldName: 'email', unique: true });
db.members.ensureIndex({ fieldName: 'projectId' });
db.tasks.ensureIndex({ fieldName: 'projectId' });
db.comments.ensureIndex({ fieldName: 'taskId' });

module.exports = db;
