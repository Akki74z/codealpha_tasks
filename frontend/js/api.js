const BASE = '/api';
const getToken = () => localStorage.getItem('tf_token');

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const API = {
  register: b => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(b) }),
  login: b => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(b) }),
  getMe: () => apiFetch('/users/me'),
  searchUsers: q => apiFetch(`/users/search?q=${encodeURIComponent(q)}`),
  getAllUsers: () => apiFetch('/users'),

  getProjects: () => apiFetch('/projects'),
  getProject: id => apiFetch(`/projects/${id}`),
  createProject: b => apiFetch('/projects', { method: 'POST', body: JSON.stringify(b) }),
  updateProject: (id, b) => apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteProject: id => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
  addMember: (pid, uid) => apiFetch(`/projects/${pid}/members`, { method: 'POST', body: JSON.stringify({ userId: uid }) }),
  removeMember: (pid, uid) => apiFetch(`/projects/${pid}/members/${uid}`, { method: 'DELETE' }),

  getTasks: pid => apiFetch(`/tasks/project/${pid}`),
  createTask: b => apiFetch('/tasks', { method: 'POST', body: JSON.stringify(b) }),
  updateTask: (id, b) => apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteTask: id => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),

  getComments: tid => apiFetch(`/comments/${tid}`),
  addComment: (tid, content) => apiFetch(`/comments/${tid}`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: id => apiFetch(`/comments/${id}`, { method: 'DELETE' }),
};
