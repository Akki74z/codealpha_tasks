const Datastore = require('nedb');
const path = require('path');

const dbPath = path.join(__dirname, '../data');
const fs = require('fs');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

const db = {
  users: new Datastore({ filename: path.join(dbPath, 'users.db'), autoload: true }),
  posts: new Datastore({ filename: path.join(dbPath, 'posts.db'), autoload: true }),
  comments: new Datastore({ filename: path.join(dbPath, 'comments.db'), autoload: true }),
  followers: new Datastore({ filename: path.join(dbPath, 'followers.db'), autoload: true }),
  likes: new Datastore({ filename: path.join(dbPath, 'likes.db'), autoload: true }),
};

// Create indexes
db.users.ensureIndex({ fieldName: 'username', unique: true });
db.users.ensureIndex({ fieldName: 'email', unique: true });
db.followers.ensureIndex({ fieldName: 'followerId' });
db.followers.ensureIndex({ fieldName: 'followingId' });
db.likes.ensureIndex({ fieldName: 'postId' });

module.exports = db;
