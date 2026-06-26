// ===== STATE =====
let currentUser = null;
let currentCommentPostId = null;
let searchDebounce = null;

// ===== INIT =====
window.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('vibe_token');
  if (token) {
    try {
      const user = await API.getMe();
      loginSuccess(user, token);
    } catch {
      localStorage.removeItem('vibe_token');
      showAuth();
    }
  } else {
    showAuth();
  }
});

// ===== AUTH =====
function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

function showLogin() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
}

function showRegister() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
}

function loginSuccess(user, token) {
  currentUser = user;
  localStorage.setItem('vibe_token', token);
  updateSidebar();
  showApp();
  navigate('feed', document.querySelector('[data-page="feed"]'));
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  if (!email || !password) {
    showFormError(errEl, 'Please fill in all fields.');
    return;
  }

  try {
    const { token, user } = await API.login({ email, password });
    loginSuccess(user, token);
  } catch (e) {
    showFormError(errEl, e.message);
  }
}

async function handleRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const bio = document.getElementById('reg-bio').value.trim();
  const errEl = document.getElementById('reg-error');
  errEl.classList.add('hidden');

  if (!username || !email || !password) {
    showFormError(errEl, 'Please fill in all required fields.');
    return;
  }
  if (password.length < 6) {
    showFormError(errEl, 'Password must be at least 6 characters.');
    return;
  }

  try {
    const { token, user } = await API.register({ username, email, password, bio });
    loginSuccess(user, token);
    showToast('Account created! Welcome to Vibe 🎉');
  } catch (e) {
    showFormError(errEl, e.message);
  }
}

function logout() {
  localStorage.removeItem('vibe_token');
  currentUser = null;
  showAuth();
  showLogin();
}

function showFormError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ===== SIDEBAR =====
function updateSidebar() {
  if (!currentUser) return;
  const avatar = document.getElementById('sidebar-avatar');
  avatar.style.background = currentUser.avatarColor;
  avatar.textContent = currentUser.avatarInitials;

  const composeAvatar = document.getElementById('compose-avatar');
  composeAvatar.style.background = currentUser.avatarColor;
  composeAvatar.textContent = currentUser.avatarInitials;

  const modalAvatar = document.getElementById('modal-compose-avatar');
  modalAvatar.style.background = currentUser.avatarColor;
  modalAvatar.textContent = currentUser.avatarInitials;

  document.getElementById('sidebar-username').textContent = '@' + currentUser.username;
}

// ===== NAVIGATION =====
function navigate(page, el) {
  // update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  // switch page
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  const target = document.getElementById('page-' + page);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  // load page data
  if (page === 'feed') loadFeed();
  if (page === 'explore') loadExplore();
  if (page === 'profile') loadProfile(currentUser.username);
}

// ===== FEED =====
async function loadFeed() {
  const container = document.getElementById('feed-posts');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const posts = await API.getFeed();
    if (posts.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <h3>Your feed is empty</h3>
        <p>Follow some people to see their posts here, or explore all posts.</p>
      </div>`;
    } else {
      container.innerHTML = posts.map(renderPost).join('');
    }
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>Failed to load feed.</p></div>`;
  }
}

// ===== EXPLORE =====
async function loadExplore() {
  const container = document.getElementById('explore-posts');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const posts = await API.getExplore();
    if (posts.length === 0) {
      container.innerHTML = `<div class="empty-state"><h3>No posts yet</h3><p>Be the first to post!</p></div>`;
    } else {
      container.innerHTML = posts.map(renderPost).join('');
    }
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>Failed to load posts.</p></div>`;
  }
  loadSuggestions();
}

// ===== PROFILE =====
async function loadProfile(username) {
  const container = document.getElementById('profile-content');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  try {
    const user = await API.getUser(username);
    const isOwn = user._id === currentUser._id;
    const followBtn = isOwn
      ? `<button class="btn btn-secondary btn-sm" onclick="editBio()">Edit Profile</button>`
      : user.isFollowing
        ? `<button class="btn btn-unfollow btn-sm" id="follow-btn" onclick="toggleFollow('${user._id}', '${username}')">Following</button>`
        : `<button class="btn btn-follow btn-sm" id="follow-btn" onclick="toggleFollow('${user._id}', '${username}')">Follow</button>`;

    container.innerHTML = `
      <div class="profile-header">
        <div class="profile-top">
          <div class="avatar-lg" style="background:${user.avatarColor}">${user.avatarInitials}</div>
          ${followBtn}
        </div>
        <div class="profile-username">@${user.username}</div>
        ${user.bio ? `<div class="profile-bio">${escapeHtml(user.bio)}</div>` : ''}
        <div class="profile-stats">
          <div class="stat"><span class="stat-num" id="stat-posts">${user.postsCount}</span><span class="stat-label">Posts</span></div>
          <div class="stat"><span class="stat-num" id="stat-followers">${user.followersCount}</span><span class="stat-label">Followers</span></div>
          <div class="stat"><span class="stat-num">${user.followingCount}</span><span class="stat-label">Following</span></div>
        </div>
      </div>
      <div id="profile-posts" class="posts-container">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>
    `;

    const posts = await API.getUserPosts(username);
    const postsContainer = document.getElementById('profile-posts');
    if (posts.length === 0) {
      postsContainer.innerHTML = `<div class="empty-state"><h3>No posts yet</h3><p>${isOwn ? 'Share something!' : `@${username} hasn't posted yet.`}</p></div>`;
    } else {
      postsContainer.innerHTML = posts.map(renderPost).join('');
    }
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>User not found.</p></div>`;
  }
}

function editBio() {
  const newBio = prompt('Update your bio:', currentUser.bio || '');
  if (newBio === null) return;
  API.updateProfile({ bio: newBio }).then(user => {
    currentUser = user;
    loadProfile(currentUser.username);
    showToast('Profile updated!');
  }).catch(e => showToast('Failed to update: ' + e.message));
}

// ===== FOLLOW =====
async function toggleFollow(userId, username) {
  try {
    const result = await API.toggleFollow(userId);
    const btn = document.getElementById('follow-btn');
    if (result.following) {
      btn.className = 'btn btn-unfollow btn-sm';
      btn.textContent = 'Following';
    } else {
      btn.className = 'btn btn-follow btn-sm';
      btn.textContent = 'Follow';
    }
    const followersStat = document.getElementById('stat-followers');
    if (followersStat) followersStat.textContent = result.followersCount;
    showToast(result.following ? `Following @${username}` : `Unfollowed @${username}`);
    loadSuggestions();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

// ===== POSTS =====
function renderPost(post) {
  const isOwn = post.userId === currentUser._id;
  const timeAgo = getTimeAgo(post.createdAt);
  return `
    <div class="post-card" id="post-${post._id}">
      <div class="avatar" style="background:${post.author.avatarColor || '#6C63FF'}">${post.author.avatarInitials || '?'}</div>
      <div class="post-body">
        <div class="post-meta">
          <span class="post-username" onclick="viewProfile('${post.author.username}')">${escapeHtml(post.author.username || 'Unknown')}</span>
          <span class="post-time">${timeAgo}</span>
          ${isOwn ? `<button class="post-delete" onclick="deletePost('${post._id}')">✕ Delete</button>` : ''}
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-actions">
          <button class="action-btn ${post.liked ? 'liked' : ''}" id="like-btn-${post._id}" onclick="likePost('${post._id}')">
            <svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"/></svg>
            <span id="like-count-${post._id}">${post.likesCount}</span>
          </button>
          <button class="action-btn" onclick="openComments('${post._id}')">
            <svg viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            <span id="comment-count-${post._id}">${post.commentsCount}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

async function createPost() {
  const input = document.getElementById('post-input');
  const content = input.value.trim();
  if (!content) return;
  if (content.length > 280) {
    showToast('Post too long! Max 280 characters.');
    return;
  }
  try {
    await API.createPost(content);
    input.value = '';
    document.getElementById('char-count').textContent = '280';
    input.style.height = 'auto';
    showToast('Posted! ✨');
    loadFeed();
  } catch (e) {
    showToast('Failed to post: ' + e.message);
  }
}

async function deletePost(postId) {
  if (!confirm('Delete this post?')) return;
  try {
    await API.deletePost(postId);
    const el = document.getElementById('post-' + postId);
    if (el) el.remove();
    showToast('Post deleted.');
  } catch (e) {
    showToast('Failed to delete: ' + e.message);
  }
}

async function likePost(postId) {
  try {
    const result = await API.likePost(postId);
    const btn = document.getElementById('like-btn-' + postId);
    const count = document.getElementById('like-count-' + postId);
    if (result.liked) btn.classList.add('liked');
    else btn.classList.remove('liked');
    count.textContent = result.likesCount;
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

// ===== COMMENTS MODAL =====
async function openComments(postId) {
  currentCommentPostId = postId;
  document.getElementById('comments-modal').classList.remove('hidden');
  document.getElementById('comment-input').value = '';
  await loadComments(postId);
}

async function loadComments(postId) {
  const list = document.getElementById('modal-comments-list');
  list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const comments = await API.getComments(postId);
    if (comments.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:24px"><p>No comments yet. Be the first!</p></div>`;
    } else {
      list.innerHTML = comments.map(renderComment).join('');
    }
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><p>Failed to load comments.</p></div>`;
  }
}

function renderComment(comment) {
  const isOwn = comment.userId === currentUser._id;
  return `
    <div class="comment-item" id="comment-${comment._id}">
      <div class="avatar" style="background:${comment.author.avatarColor || '#6C63FF'}; width:32px; height:32px; font-size:12px">${comment.author.avatarInitials || '?'}</div>
      <div class="comment-body">
        <div class="comment-meta">
          <span class="comment-username">@${escapeHtml(comment.author.username || 'Unknown')}</span>
          <span class="comment-time">${getTimeAgo(comment.createdAt)}</span>
          ${isOwn ? `<button class="comment-delete" onclick="deleteComment('${comment._id}')">✕</button>` : ''}
        </div>
        <div class="comment-text">${escapeHtml(comment.content)}</div>
      </div>
    </div>
  `;
}

async function submitComment() {
  const input = document.getElementById('comment-input');
  const content = input.value.trim();
  if (!content || !currentCommentPostId) return;
  try {
    await API.addComment(currentCommentPostId, content);
    input.value = '';
    await loadComments(currentCommentPostId);
    // Update comment count in post
    const countEl = document.getElementById('comment-count-' + currentCommentPostId);
    if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
  } catch (e) {
    showToast('Failed to comment: ' + e.message);
  }
}

async function deleteComment(commentId) {
  try {
    await API.deleteComment(commentId);
    const el = document.getElementById('comment-' + commentId);
    if (el) el.remove();
    const countEl = document.getElementById('comment-count-' + currentCommentPostId);
    if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
  } catch (e) {
    showToast('Failed to delete comment.');
  }
}

function closeCommentsModal(e) {
  if (!e || e.target === document.getElementById('comments-modal') || e.target.classList.contains('modal-close')) {
    document.getElementById('comments-modal').classList.add('hidden');
    currentCommentPostId = null;
  }
}

// Allow Enter to submit comment
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement.id === 'comment-input') {
    submitComment();
  }
});

// ===== SEARCH =====
function searchUsers(query) {
  clearTimeout(searchDebounce);
  const resultsEl = document.getElementById('search-results');
  if (!query.trim()) {
    resultsEl.classList.add('hidden');
    return;
  }
  searchDebounce = setTimeout(async () => {
    try {
      const users = await API.searchUsers(query);
      const filtered = users.filter(u => u._id !== currentUser._id);
      if (filtered.length === 0) {
        resultsEl.innerHTML = `<div class="search-result-item"><span style="color:var(--text2);font-size:13px">No users found</span></div>`;
      } else {
        resultsEl.innerHTML = filtered.map(u => `
          <div class="search-result-item" onclick="viewProfile('${u.username}')">
            <div class="avatar" style="background:${u.avatarColor}">${u.avatarInitials}</div>
            <div>
              <div class="search-result-name">@${escapeHtml(u.username)}</div>
              ${u.bio ? `<div class="search-result-bio">${escapeHtml(u.bio)}</div>` : ''}
            </div>
          </div>
        `).join('');
      }
      resultsEl.classList.remove('hidden');
    } catch {}
  }, 300);
}

// ===== SUGGESTIONS =====
async function loadSuggestions() {
  const listEl = document.getElementById('suggestions-list');
  try {
    const all = await API.searchUsers('');
    const followers = await API.getFollowing(currentUser._id);
    const followingIds = new Set(followers.map(f => f._id));
    const suggestions = all.filter(u => u._id !== currentUser._id && !followingIds.has(u._id)).slice(0, 5);

    if (suggestions.length === 0) {
      listEl.innerHTML = `<p style="color:var(--text2);font-size:13px">You're following everyone!</p>`;
      return;
    }

    listEl.innerHTML = suggestions.map(u => `
      <div class="suggestion-item">
        <div class="avatar" style="background:${u.avatarColor}">${u.avatarInitials}</div>
        <div class="suggestion-info">
          <div class="suggestion-name" onclick="viewProfile('${u.username}')">@${escapeHtml(u.username)}</div>
          ${u.bio ? `<div class="suggestion-bio">${escapeHtml(u.bio)}</div>` : ''}
        </div>
        <button class="btn btn-follow btn-sm" onclick="quickFollow('${u._id}', '${u.username}', this)">Follow</button>
      </div>
    `).join('');
  } catch {
    listEl.innerHTML = '';
  }
}

async function quickFollow(userId, username, btn) {
  try {
    const result = await API.toggleFollow(userId);
    if (result.following) {
      btn.closest('.suggestion-item').remove();
      showToast(`Following @${username}`);
    }
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

// ===== VIEW PROFILE =====
function viewProfile(username) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector('[data-page="profile"]').classList.add('active');
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  document.getElementById('page-profile').classList.remove('hidden');
  document.getElementById('page-profile').classList.add('active');
  loadProfile(username);
  // Close modal if open
  document.getElementById('comments-modal').classList.add('hidden');
}

// ===== CHAR COUNT =====
document.addEventListener('DOMContentLoaded', () => {
  const postInput = document.getElementById('post-input');
  if (postInput) {
    postInput.addEventListener('input', () => {
      const remaining = 280 - postInput.value.length;
      const counter = document.getElementById('char-count');
      counter.textContent = remaining;
      counter.className = 'char-count';
      if (remaining <= 20) counter.classList.add('warning');
      if (remaining < 0) counter.classList.add('danger');
    });
  }
});

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ===== UTILS =====
function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}
