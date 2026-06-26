// ===== STATE =====
let currentUser = null;
let currentProject = null;
let currentTasks = [];
let currentDetailTask = null;
let editingTaskId = null;
let allProjects = [];
let ws = null;

// ===== INIT =====
window.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('tf_token');
  if (token) {
    try {
      const user = await API.getMe();
      loginSuccess(user, token);
    } catch {
      localStorage.removeItem('tf_token');
    }
  }
});

// ===== AUTH =====
function showLogin() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
}
function showRegister() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.classList.add('hidden');
  if (!email || !password) return showErr(err, 'Please fill all fields.');
  try {
    const { token, user } = await API.login({ email, password });
    loginSuccess(user, token);
  } catch (e) { showErr(err, e.message); }
}

async function handleRegister() {
  const fullName = document.getElementById('reg-fullname').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const err = document.getElementById('reg-error');
  err.classList.add('hidden');
  if (!fullName || !username || !email || !password) return showErr(err, 'All fields are required.');
  if (password.length < 6) return showErr(err, 'Password must be 6+ characters.');
  try {
    const { token, user } = await API.register({ fullName, username, email, password });
    loginSuccess(user, token);
    showToast('Welcome to TaskFlow! 🎉');
  } catch (e) { showErr(err, e.message); }
}

function loginSuccess(user, token) {
  currentUser = user;
  localStorage.setItem('tf_token', token);
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateSidebar();
  setGreeting();
  connectWebSocket();
  navigate('dashboard', document.querySelector('[data-page="dashboard"]'));
}

function logout() {
  localStorage.removeItem('tf_token');
  currentUser = null;
  if (ws) ws.close();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  showLogin();
}

// ===== WEBSOCKET =====
function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onopen = () => {
    document.getElementById('ws-indicator').classList.add('connected');
    document.getElementById('ws-indicator').title = 'Connected — real-time updates active';
  };

  ws.onclose = () => {
    document.getElementById('ws-indicator').classList.remove('connected');
    setTimeout(connectWebSocket, 3000);
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handleWsMessage(data);
    } catch {}
  };
}

function handleWsMessage(data) {
  if (data.type === 'connected') return;

  if (data.type === 'task_created' || data.type === 'task_updated' || data.type === 'task_deleted') {
    if (currentProject && data.task?.projectId === currentProject._id) {
      loadBoard(currentProject._id);
    }
    showWsToast(`🔔 Task ${data.type.replace('task_', '')} by a team member`);
  }

  if (data.type === 'project_created' || data.type === 'project_deleted') {
    loadSidebarProjects();
    if (document.getElementById('page-dashboard').classList.contains('active')) loadDashboard();
    if (document.getElementById('page-projects').classList.contains('active')) loadProjects();
  }

  if (data.type === 'comment_added' && currentDetailTask) {
    if (data.comment.taskId === currentDetailTask._id) loadDetailComments(currentDetailTask._id);
  }
}

// ===== SIDEBAR =====
function updateSidebar() {
  const av = document.getElementById('sidebar-avatar');
  av.style.background = currentUser.avatarColor;
  av.textContent = currentUser.avatarInitials;
  document.getElementById('sidebar-fullname').textContent = currentUser.fullName;
  loadSidebarProjects();
}

async function loadSidebarProjects() {
  try {
    const projects = await API.getProjects();
    allProjects = projects;
    const el = document.getElementById('sidebar-projects');
    el.innerHTML = projects.slice(0, 6).map(p => `
      <div class="sidebar-project-item" onclick="openBoard('${p._id}')">
        <div class="sidebar-project-dot" style="background:${p.color}"></div>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span>
      </div>
    `).join('') || '<div style="padding:4px 10px;font-size:12px;color:var(--text3)">No projects yet</div>';
  } catch {}
}

// ===== NAVIGATE =====
function navigate(page, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  const target = document.getElementById('page-' + page);
  if (target) { target.classList.remove('hidden'); target.classList.add('active'); }
  if (page === 'dashboard') loadDashboard();
  if (page === 'projects') loadProjects();
}

// ===== DASHBOARD =====
async function loadDashboard() {
  setGreeting();
  try {
    const projects = await API.getProjects();
    allProjects = projects;
    loadSidebarProjects();

    // Stats
    let totalTasks = 0, doneTasks = 0;
    projects.forEach(p => {
      totalTasks += p.taskCount || 0;
    });

    document.getElementById('dashboard-stats').innerHTML = `
      <div class="stat-card"><div class="stat-card-num">${projects.length}</div><div class="stat-card-label">Projects</div></div>
      <div class="stat-card"><div class="stat-card-num">${totalTasks}</div><div class="stat-card-label">Total Tasks</div></div>
      <div class="stat-card"><div class="stat-card-num">${projects.reduce((a,p)=>a+(p.memberCount||1),0)}</div><div class="stat-card-label">Team Members</div></div>
      <div class="stat-card"><div class="stat-card-num">${projects.filter(p=>p.ownerId===currentUser._id).length}</div><div class="stat-card-label">Owned by You</div></div>
    `;

    const grid = document.getElementById('dashboard-projects');
    if (projects.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>No projects yet</h3><p>Create your first project to get started.</p><button class="btn btn-primary" onclick="openCreateProject()">+ New Project</button></div>`;
    } else {
      grid.innerHTML = projects.slice(0, 6).map(renderProjectCard).join('');
    }
  } catch (e) {
    document.getElementById('dashboard-projects').innerHTML = `<div class="empty-state"><p>Failed to load.</p></div>`;
  }
}

// ===== PROJECTS =====
async function loadProjects() {
  const grid = document.getElementById('all-projects-grid');
  grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const projects = await API.getProjects();
    allProjects = projects;
    loadSidebarProjects();
    if (projects.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>No projects</h3><p>Start by creating a new project.</p><button class="btn btn-primary" onclick="openCreateProject()">+ New Project</button></div>`;
    } else {
      grid.innerHTML = projects.map(renderProjectCard).join('');
    }
  } catch {
    grid.innerHTML = `<div class="empty-state"><p>Failed to load projects.</p></div>`;
  }
}

function renderProjectCard(p) {
  return `
    <div class="project-card" onclick="openBoard('${p._id}')">
      <div class="project-card-accent" style="background:${p.color}"></div>
      <div class="project-card-name">${esc(p.name)}</div>
      <div class="project-card-desc">${esc(p.description) || '<span style="color:var(--text3)">No description</span>'}</div>
      <div class="project-card-footer">
        <span class="project-card-meta">${p.taskCount || 0} tasks · ${p.memberCount || 1} member${(p.memberCount||1)>1?'s':''}</span>
      </div>
    </div>
  `;
}

// ===== BOARD =====
async function openBoard(projectId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  document.getElementById('page-board').classList.remove('hidden');
  document.getElementById('page-board').classList.add('active');
  await loadBoard(projectId);
}

async function loadBoard(projectId) {
  try {
    const project = await API.getProject(projectId);
    currentProject = project;

    document.getElementById('board-title').textContent = project.name;
    document.getElementById('board-desc').textContent = project.description || '';

    // Members bar
    const membersBar = document.getElementById('board-members-bar');
    membersBar.innerHTML = `<span class="members-bar-label">Team:</span>` +
      (project.members || []).map(m => `
        <div class="avatar" style="background:${m.avatarColor};width:28px;height:28px;font-size:11px" title="${esc(m.fullName)} (@${esc(m.username)})">${m.avatarInitials}</div>
      `).join('') +
      (project.ownerId === currentUser._id ? `<button class="btn btn-secondary btn-sm" style="margin-left:8px" onclick="openManageMembers()">+ Add</button>` : '');

    const tasks = await API.getTasks(projectId);
    currentTasks = tasks;

    const statuses = ['todo', 'inprogress', 'review', 'done'];
    statuses.forEach(s => {
      const col = document.getElementById('tasks-' + s);
      const filtered = tasks.filter(t => t.status === s);
      document.getElementById('count-' + s).textContent = filtered.length;
      col.innerHTML = filtered.map(renderTaskCard).join('') || '';
    });
  } catch (e) {
    showToast('Failed to load board.');
  }
}

function renderTaskCard(task) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  return `
    <div class="task-card" onclick="openTaskDetail('${task._id}')">
      <div class="task-card-title">${esc(task.title)}</div>
      ${task.description ? `<div style="font-size:12px;color:var(--text2);margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(task.description)}</div>` : ''}
      <div class="task-card-footer">
        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
        <div class="task-card-meta">
          ${task.commentCount ? `<span class="task-comment-count">💬 ${task.commentCount}</span>` : ''}
          ${task.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">${isOverdue ? '⚠ ' : ''}${formatDate(task.dueDate)}</span>` : ''}
          ${task.assignee ? `<div class="task-assignee-sm" style="background:${task.assignee.avatarColor}" title="${esc(task.assignee.fullName)}">${task.assignee.avatarInitials}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ===== TASK DETAIL =====
async function openTaskDetail(taskId) {
  const task = currentTasks.find(t => t._id === taskId);
  if (!task) return;
  currentDetailTask = task;

  document.getElementById('detail-title').textContent = task.title;

  document.getElementById('detail-meta').innerHTML = `
    <span class="priority-badge priority-${task.priority}">${task.priority} priority</span>
    <span class="detail-tag" style="background:var(--bg3);color:var(--text2)">${statusLabel(task.status)}</span>
    ${task.dueDate ? `<span class="detail-tag" style="background:var(--bg3);color:var(--text2)">Due: ${formatDate(task.dueDate)}</span>` : ''}
  `;

  document.getElementById('detail-desc').textContent = task.description || 'No description provided.';

  // Sidebar details
  const isOwner = currentProject?.ownerId === currentUser._id;
  document.getElementById('detail-sidebar-content').innerHTML = `
    <div class="detail-sidebar-item">
      <div class="detail-sidebar-label">Status</div>
      <select class="detail-sidebar-val" style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:13px;width:100%;outline:none"
        onchange="updateTaskField('${task._id}', 'status', this.value)">
        ${['todo','inprogress','review','done'].map(s => `<option value="${s}" ${task.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}
      </select>
    </div>
    <div class="detail-sidebar-item">
      <div class="detail-sidebar-label">Priority</div>
      <select class="detail-sidebar-val" style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:13px;width:100%;outline:none"
        onchange="updateTaskField('${task._id}', 'priority', this.value)">
        ${['low','medium','high'].map(p => `<option value="${p}" ${task.priority===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('')}
      </select>
    </div>
    <div class="detail-sidebar-item">
      <div class="detail-sidebar-label">Assignee</div>
      <div class="detail-sidebar-val">
        ${task.assignee ? `<div class="avatar" style="background:${task.assignee.avatarColor};width:24px;height:24px;font-size:10px">${task.assignee.avatarInitials}</div> ${esc(task.assignee.fullName)}` : 'Unassigned'}
      </div>
    </div>
    <div class="detail-sidebar-item">
      <div class="detail-sidebar-label">Created</div>
      <div class="detail-sidebar-val">${formatDate(task.createdAt)}</div>
    </div>
  `;

  document.getElementById('detail-actions').innerHTML = `
    <button class="btn btn-secondary btn-sm" onclick="openEditTask('${task._id}')">✏ Edit Task</button>
    <button class="btn btn-danger btn-sm" onclick="deleteTaskFromDetail('${task._id}')">🗑 Delete</button>
  `;

  // Comment avatar
  const ca = document.getElementById('detail-comment-avatar');
  ca.style.background = currentUser.avatarColor;
  ca.textContent = currentUser.avatarInitials;

  document.getElementById('detail-comment-input').value = '';
  await loadDetailComments(task._id);
  document.getElementById('modal-task-detail').classList.remove('hidden');
}

async function loadDetailComments(taskId) {
  const list = document.getElementById('detail-comments');
  try {
    const comments = await API.getComments(taskId);
    if (comments.length === 0) {
      list.innerHTML = `<div style="color:var(--text3);font-size:13px;padding:8px 0">No comments yet.</div>`;
    } else {
      list.innerHTML = comments.map(c => `
        <div class="comment-item" id="comment-${c._id}">
          <div class="avatar comment-avatar" style="background:${c.author.avatarColor}">${c.author.avatarInitials}</div>
          <div class="comment-body">
            <div class="comment-meta">
              <span class="comment-name">${esc(c.author.fullName)}</span>
              <span class="comment-time">${timeAgo(c.createdAt)}</span>
              ${c.userId === currentUser._id ? `<button class="comment-delete" onclick="deleteComment('${c._id}')">✕</button>` : ''}
            </div>
            <div class="comment-text">${esc(c.content)}</div>
          </div>
        </div>
      `).join('');
    }
    list.scrollTop = list.scrollHeight;
  } catch {}
}

async function submitDetailComment() {
  const input = document.getElementById('detail-comment-input');
  const content = input.value.trim();
  if (!content || !currentDetailTask) return;
  try {
    await API.addComment(currentDetailTask._id, content);
    input.value = '';
    await loadDetailComments(currentDetailTask._id);
    loadBoard(currentProject._id);
  } catch (e) { showToast('Failed: ' + e.message); }
}

async function deleteComment(id) {
  try {
    await API.deleteComment(id);
    document.getElementById('comment-' + id)?.remove();
  } catch {}
}

async function updateTaskField(taskId, field, value) {
  try {
    const updated = await API.updateTask(taskId, { [field]: value });
    const idx = currentTasks.findIndex(t => t._id === taskId);
    if (idx > -1) currentTasks[idx] = { ...currentTasks[idx], ...updated };
    loadBoard(currentProject._id);
  } catch (e) { showToast('Update failed: ' + e.message); }
}

async function deleteTaskFromDetail(taskId) {
  if (!confirm('Delete this task?')) return;
  try {
    await API.deleteTask(taskId);
    closeModal('modal-task-detail');
    loadBoard(currentProject._id);
    showToast('Task deleted.');
  } catch (e) { showToast('Failed: ' + e.message); }
}

// ===== CREATE/EDIT TASK =====
function openCreateTask(defaultStatus = 'todo') {
  editingTaskId = null;
  document.getElementById('task-modal-title').textContent = 'New Task';
  document.getElementById('task-submit-btn').textContent = 'Create Task';
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-status').value = defaultStatus;
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-due').value = '';
  document.getElementById('task-error').classList.add('hidden');
  populateAssigneeDropdown();
  document.getElementById('modal-task').classList.remove('hidden');
}

function openEditTask(taskId) {
  const task = currentTasks.find(t => t._id === taskId);
  if (!task) return;
  editingTaskId = taskId;
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('task-submit-btn').textContent = 'Save Changes';
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-desc').value = task.description || '';
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-due').value = task.dueDate ? task.dueDate.split('T')[0] : '';
  document.getElementById('task-error').classList.add('hidden');
  populateAssigneeDropdown(task.assigneeId);
  closeModal('modal-task-detail');
  document.getElementById('modal-task').classList.remove('hidden');
}

async function populateAssigneeDropdown(selectedId = '') {
  const sel = document.getElementById('task-assignee');
  sel.innerHTML = '<option value="">Unassigned</option>';
  if (!currentProject) return;
  (currentProject.members || []).forEach(m => {
    sel.innerHTML += `<option value="${m._id}" ${m._id === selectedId ? 'selected' : ''}>${esc(m.fullName)} (@${esc(m.username)})</option>`;
  });
}

async function submitTask() {
  const title = document.getElementById('task-title').value.trim();
  const err = document.getElementById('task-error');
  err.classList.add('hidden');
  if (!title) return showErr(err, 'Task title is required.');

  const body = {
    projectId: currentProject._id,
    title,
    description: document.getElementById('task-desc').value.trim(),
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    assigneeId: document.getElementById('task-assignee').value || null,
    dueDate: document.getElementById('task-due').value || null,
  };

  try {
    if (editingTaskId) {
      await API.updateTask(editingTaskId, body);
      showToast('Task updated!');
    } else {
      await API.createTask(body);
      showToast('Task created! ✓');
    }
    closeModal('modal-task');
    loadBoard(currentProject._id);
  } catch (e) { showErr(err, e.message); }
}

// ===== CREATE PROJECT =====
function openCreateProject() {
  document.getElementById('proj-name').value = '';
  document.getElementById('proj-desc').value = '';
  document.getElementById('proj-error').classList.add('hidden');
  document.getElementById('modal-project').classList.remove('hidden');
}

async function createProject() {
  const name = document.getElementById('proj-name').value.trim();
  const description = document.getElementById('proj-desc').value.trim();
  const err = document.getElementById('proj-error');
  err.classList.add('hidden');
  if (!name) return showErr(err, 'Project name is required.');
  try {
    const project = await API.createProject({ name, description });
    closeModal('modal-project');
    showToast('Project created! 🚀');
    await loadSidebarProjects();
    openBoard(project._id);
  } catch (e) { showErr(err, e.message); }
}

// ===== MEMBERS =====
let memberSearchDebounce = null;

async function openManageMembers() {
  document.getElementById('member-search').value = '';
  document.getElementById('member-search-results').innerHTML = '';
  document.getElementById('modal-members').classList.remove('hidden');
  loadCurrentMembers();
}

async function loadCurrentMembers() {
  const list = document.getElementById('current-members-list');
  try {
    const project = await API.getProject(currentProject._id);
    currentProject = project;
    list.innerHTML = (project.members || []).map(m => `
      <div class="current-member-item">
        <div class="avatar" style="background:${m.avatarColor};width:32px;height:32px;font-size:12px">${m.avatarInitials}</div>
        <div>
          <div style="font-weight:600;font-size:13px">${esc(m.fullName)}</div>
          <div style="font-size:12px;color:var(--text2)">@${esc(m.username)}</div>
        </div>
        <span class="member-role">${m._id === currentProject.ownerId ? '👑 Owner' : 'Member'}</span>
        ${m._id !== currentProject.ownerId && currentProject.ownerId === currentUser._id
          ? `<button class="btn btn-danger btn-sm" onclick="removeMember('${m._id}')">Remove</button>` : ''}
      </div>
    `).join('') || '<div style="color:var(--text3);font-size:13px">No members yet.</div>';
  } catch {}
}

function searchMemberUsers(q) {
  clearTimeout(memberSearchDebounce);
  const results = document.getElementById('member-search-results');
  if (!q.trim()) { results.innerHTML = ''; return; }
  memberSearchDebounce = setTimeout(async () => {
    try {
      const users = await API.searchUsers(q);
      const memberIds = new Set((currentProject.members || []).map(m => m._id));
      const filtered = users.filter(u => u._id !== currentUser._id && !memberIds.has(u._id));
      results.innerHTML = filtered.length === 0
        ? '<div class="member-result-item"><span style="color:var(--text2)">No users found</span></div>'
        : filtered.map(u => `
          <div class="member-result-item" onclick="addMember('${u._id}')">
            <div class="avatar" style="background:${u.avatarColor};width:32px;height:32px;font-size:12px">${u.avatarInitials}</div>
            <div>
              <div class="member-result-name">${esc(u.fullName)}</div>
              <div class="member-result-user">@${esc(u.username)}</div>
            </div>
            <button class="btn btn-primary btn-sm">Add</button>
          </div>
        `).join('');
    } catch {}
  }, 300);
}

async function addMember(userId) {
  try {
    await API.addMember(currentProject._id, userId);
    showToast('Member added!');
    document.getElementById('member-search').value = '';
    document.getElementById('member-search-results').innerHTML = '';
    loadCurrentMembers();
    loadBoard(currentProject._id);
  } catch (e) { showToast('Error: ' + e.message); }
}

async function removeMember(userId) {
  try {
    await API.removeMember(currentProject._id, userId);
    showToast('Member removed.');
    loadCurrentMembers();
    loadBoard(currentProject._id);
  } catch (e) { showToast('Error: ' + e.message); }
}

// ===== MODALS =====
function closeModal(id, e) {
  if (e && e.target !== document.getElementById(id)) return;
  document.getElementById(id).classList.add('hidden');
  if (id === 'modal-task-detail') currentDetailTask = null;
}

// ===== UTILS =====
function showErr(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function showWsToast(msg) {
  const t = document.getElementById('ws-toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 4000);
}

function setGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const el = document.getElementById('dashboard-greeting');
  if (el) el.textContent = `${g}, ${currentUser?.fullName?.split(' ')[0] || ''}! 👋`;
}

function statusLabel(s) {
  return { todo: 'To Do', inprogress: 'In Progress', review: 'Review', done: 'Done' }[s] || s;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Enter key for comments
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.id === 'detail-comment-input') submitDetailComment();
});
