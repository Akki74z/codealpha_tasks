const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('vibe_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE_URL + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

const API = {
  // Auth
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // Users
  getMe: () => apiFetch('/users/me'),
  getUser: (username) => apiFetch(`/users/${username}`),
  updateProfile: (body) => apiFetch('/users/me', { method: 'PUT', body: JSON.stringify(body) }),
  searchUsers: (q) => apiFetch(`/users?q=${encodeURIComponent(q)}`),

  // Posts
  getFeed: () => apiFetch('/posts/feed'),
  getExplore: () => apiFetch('/posts/explore'),
  getUserPosts: (username) => apiFetch(`/posts/user/${username}`),
  createPost: (content) => apiFetch('/posts', { method: 'POST', body: JSON.stringify({ content }) }),
  deletePost: (id) => apiFetch(`/posts/${id}`, { method: 'DELETE' }),
  likePost: (id) => apiFetch(`/posts/${id}/like`, { method: 'POST' }),

  // Comments
  getComments: (postId) => apiFetch(`/comments/${postId}`),
  addComment: (postId, content) => apiFetch(`/comments/${postId}`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: (id) => apiFetch(`/comments/${id}`, { method: 'DELETE' }),

  // Follows
  toggleFollow: (userId) => apiFetch(`/follows/${userId}`, { method: 'POST' }),
  getFollowers: (userId) => apiFetch(`/follows/${userId}/followers`),
  getFollowing: (userId) => apiFetch(`/follows/${userId}/following`),
};
