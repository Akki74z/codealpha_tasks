# Vibe — Mini Social Media Platform

A full-stack social media app built with **HTML/CSS/JavaScript** (frontend) and **Express.js + NeDB** (backend).

---

## Features

- **User Profiles** — Register, login, view/edit profile, see follower/post counts
- **Posts** — Create, view, and delete posts (280-char limit)
- **Comments** — Add and delete comments on any post
- **Like System** — Like/unlike posts with real-time count updates
- **Follow System** — Follow/unfollow users; personalized feed
- **Explore** — Browse all posts and search users
- **Suggestions** — "People to follow" panel with one-click follow

---

## Tech Stack

| Layer    | Technology              |
|----------|------------------------|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Backend  | Node.js + Express.js   |
| Database | NeDB (embedded, file-based) |
| Auth     | JWT + bcryptjs         |

---

## Project Structure

```
socialmedia/
├── backend/
│   ├── server.js            # Express app entry point
│   ├── db/
│   │   └── database.js      # NeDB setup (users, posts, comments, followers, likes)
│   ├── middleware/
│   │   └── auth.js          # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js          # POST /api/auth/register, /login
│   │   ├── users.js         # GET/PUT /api/users
│   │   ├── posts.js         # CRUD + like /api/posts
│   │   ├── comments.js      # CRUD /api/comments
│   │   └── follows.js       # Follow/unfollow /api/follows
│   ├── data/                # Auto-created; stores .db files
│   └── package.json
└── frontend/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js           # API helper functions
        └── app.js           # All UI logic
```

---

## Database Tables

| Collection  | Fields |
|-------------|--------|
| **users**   | _id, username, email, password (hashed), bio, avatarColor, avatarInitials, createdAt |
| **posts**   | _id, userId, content, createdAt |
| **comments**| _id, postId, userId, content, createdAt |
| **followers**| _id, followerId, followingId, createdAt |
| **likes**   | _id, postId, userId, createdAt |

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user |
| GET | `/api/users/:username` | Get user profile |
| PUT | `/api/users/me` | Update bio |
| GET | `/api/users?q=query` | Search users |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts/feed` | Get personalized feed |
| GET | `/api/posts/explore` | Get all posts |
| GET | `/api/posts/user/:username` | Get user's posts |
| POST | `/api/posts` | Create post |
| DELETE | `/api/posts/:id` | Delete post |
| POST | `/api/posts/:id/like` | Like/unlike post |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comments/:postId` | Get comments |
| POST | `/api/comments/:postId` | Add comment |
| DELETE | `/api/comments/:id` | Delete comment |

### Follows
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/follows/:userId` | Follow/unfollow user |
| GET | `/api/follows/:userId/followers` | Get followers |
| GET | `/api/follows/:userId/following` | Get following |

---

## Setup & Run

### Prerequisites
- Node.js (v16 or higher)
- npm

### Steps

```bash
# 1. Go to backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open browser
# Visit: http://localhost:3000
```

The frontend is served automatically by Express.
No separate frontend server needed.

---

## Notes
- Data is stored in `backend/data/` as `.db` files (auto-created on first run)
- JWT tokens expire after 7 days
- No external database required — NeDB is embedded
