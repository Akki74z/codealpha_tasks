# TaskFlow — Project Management Tool

A full-stack Trello-like project management app built with **HTML/CSS/JavaScript** (frontend) and **Express.js + WebSockets** (backend).

---

## Features

- **Auth System** — Register, login with JWT authentication
- **Project Boards** — Create projects, Kanban board with 4 columns (To Do, In Progress, Review, Done)
- **Task Cards** — Create, edit, delete tasks with title, description, priority, status, due date
- **Assign Tasks** — Assign tasks to project members
- **Comments** — Comment and communicate within tasks
- **Team Members** — Add/remove members to projects, search users
- **Real-time Updates** — WebSocket notifications when tasks/projects change
- **Dashboard** — Overview of all projects and stats

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend  | Node.js + Express.js |
| Database | NeDB (embedded, file-based) |
| Auth     | JWT + bcryptjs |
| Real-time | WebSockets (ws library) |

---

## Project Structure

```
projecttool/
├── backend/
│   ├── server.js              # Express + WebSocket server
│   ├── db/database.js         # NeDB collections
│   ├── middleware/auth.js     # JWT middleware
│   ├── routes/
│   │   ├── auth.js            # Register/Login
│   │   ├── users.js           # User search
│   │   ├── projects.js        # CRUD + members
│   │   ├── tasks.js           # CRUD tasks
│   │   └── comments.js        # Task comments
│   ├── data/                  # Auto-created DB files
│   └── package.json
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js             # API helper
        └── app.js             # All UI logic
```

---

## Database Collections

| Collection  | Fields |
|-------------|--------|
| **users**   | _id, username, email, password, fullName, avatarColor, avatarInitials |
| **projects**| _id, name, description, ownerId, color, createdAt |
| **tasks**   | _id, projectId, title, description, status, priority, assigneeId, dueDate, createdBy |
| **comments**| _id, taskId, projectId, userId, content, createdAt |
| **members** | _id, projectId, userId, joinedAt |

---

## API Endpoints

### Auth
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login

### Projects
- `GET /api/projects` — Get all projects
- `POST /api/projects` — Create project
- `GET /api/projects/:id` — Get project + members
- `PUT /api/projects/:id` — Update project
- `DELETE /api/projects/:id` — Delete project
- `POST /api/projects/:id/members` — Add member
- `DELETE /api/projects/:id/members/:userId` — Remove member

### Tasks
- `GET /api/tasks/project/:projectId` — Get all tasks
- `POST /api/tasks` — Create task
- `PUT /api/tasks/:id` — Update task (status, assignee, etc.)
- `DELETE /api/tasks/:id` — Delete task

### Comments
- `GET /api/comments/:taskId` — Get comments
- `POST /api/comments/:taskId` — Add comment
- `DELETE /api/comments/:id` — Delete comment

### WebSocket
- `ws://localhost:3001` — Real-time events: `task_created`, `task_updated`, `task_deleted`, `project_created`, `comment_added`

---

## Setup & Run

```bash
cd backend
npm install
npm start
# Open: http://localhost:3001
```
