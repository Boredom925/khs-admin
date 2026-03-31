/* =============================================
   KHS ADMIN PANEL — admin.js
   ============================================= */

const API_BASE = 'https://khs-backend.vercel.app/api';

// ─── ADMIN CREDENTIALS (change these!) ───────
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'khs@admin2025';

// ─── STATE ────────────────────────────────────
let currentSection = 'overview';
let allAdmissions = [];
let allContacts = [];
let allNotices = [];
let editingNoticeId = null;

// ─── LOGIN ────────────────────────────────────
document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('loginScreen').classList.contains('hidden')) {
    handleLogin();
  }
});

function handleLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const err  = document.getElementById('loginError');

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadAll();
    startClock();
  } else {
    err.classList.remove('hidden');
    setTimeout(() => err.classList.add('hidden'), 3000);
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
});

// ─── CLOCK ────────────────────────────────────
function startClock() {
  const el = document.getElementById('topbarTime');
  const update = () => {
    el.textContent = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit',
      second: '2-digit', day: '2-digit', month: 'short'
    });
  };
  update();
  setInterval(update, 1000);
}

// ─── NAVIGATION ──────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.section;
    switchSection(section);
  });
});

// Stat cards clickable
document.querySelectorAll('.stat-card[data-section]').forEach(card => {
  card.addEventListener('click', () => switchSection(card.dataset.section));
});

const sectionMeta = {
  overview:   { title: 'Overview',          sub: 'Dashboard summary' },
  notices:    { title: 'Notice Board',       sub: 'Post and manage school notices' },
  admissions: { title: 'Admission Inquiries',sub: 'Review and manage admission requests' },
  contacts:   { title: 'Contact Messages',   sub: 'Messages from parents and students' },
};

function switchSection(name) {
  currentSection = name;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelector(`.nav-item[data-section="${name}"]`).classList.add('active');
  document.getElementById('sectionTitle').textContent = sectionMeta[name].title;
  document.getElementById('sectionSub').textContent   = sectionMeta[name].sub;
  window.scrollTo({ top: 0 });
}

// ─── REFRESH ─────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click', () => {
  loadAll();
  showToast('Data refreshed ↻');
});

// ─── LOAD ALL DATA ────────────────────────────
async function loadAll() {
  await Promise.all([loadNotices(), loadAdmissions(), loadContacts()]);
  renderOverview();
}

// ─── NOTICES ─────────────────────────────────
async function loadNotices() {
  try {
    const res  = await fetch(`${API_BASE}/notices`);
    const data = await res.json();
    allNotices = data.success ? data.data : [];
    renderNoticesTable(allNotices);
    updateBadge('notices', allNotices.length);
    document.getElementById('stat-notices').textContent = allNotices.length;
  } catch (e) {
    document.getElementById('noticesBody').innerHTML =
      '<tr><td colspan="6" class="loading-row">⚠️ Failed to load notices</td></tr>';
  }
}

function renderNoticesTable(notices) {
  const tbody = document.getElementById('noticesBody');
  if (!notices.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">No notices found</td></tr>'; return;
  }
  tbody.innerHTML = notices.map(n => `
    <tr>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${n.title}">${n.title}</td>
      <td><span class="status-badge badge-${n.tag}">${n.tag}</span></td>
      <td style="white-space:nowrap">${fmtDate(n.publishedAt || n.createdAt)}</td>
      <td><span class="status-badge badge-${n.isUrgent}">${n.isUrgent ? '🔴 Yes' : 'No'}</span></td>
      <td><span class="status-badge badge-${n.isPublished ? 'published' : 'draft'}">${n.isPublished ? 'Published' : 'Draft'}</span></td>
      <td>
        <div class="action-btns">
          <button class="act-btn" onclick="viewNotice('${n._id}')">👁 View</button>
          <button class="act-btn" onclick="editNotice('${n._id}')">✏️ Edit</button>
          <button class="act-btn danger" onclick="deleteNotice('${n._id}')">🗑 Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Post / Edit notice form
document.getElementById('openNoticeForm').addEventListener('click', () => {
  editingNoticeId = null;
  document.getElementById('noticeFormTitle').textContent = 'Post New Notice';
  document.getElementById('noticeTitle').value = '';
  document.getElementById('noticeBody').value  = '';
  document.getElementById('noticeTag').value   = 'General';
  document.getElementById('noticeUrgent').checked = false;
  document.getElementById('editNoticeId').value = '';
  document.getElementById('submitNotice').textContent = 'Publish Notice';
  document.getElementById('noticeForm').classList.remove('hidden');
  document.getElementById('noticeTitle').focus();
});

document.getElementById('cancelNotice').addEventListener('click', () => {
  document.getElementById('noticeForm').classList.add('hidden');
  editingNoticeId = null;
});

document.getElementById('submitNotice').addEventListener('click', async () => {
  const title   = document.getElementById('noticeTitle').value.trim();
  const body    = document.getElementById('noticeBody').value.trim();
  const tag     = document.getElementById('noticeTag').value;
  const urgent  = document.getElementById('noticeUrgent').checked;
  const btn     = document.getElementById('submitNotice');

  if (!title || !body) { showToast('Title and content are required', 'error'); return; }

  btn.disabled = true;
  btn.textContent = '⏳ Saving...';

  try {
    const isEdit = !!editingNoticeId;
    const url    = isEdit ? `${API_BASE}/notices/${editingNoticeId}` : `${API_BASE}/notices`;
    const method = isEdit ? 'PUT' : 'POST';

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, tag, isUrgent: urgent, isPublished: true }),
    });
    const data = await res.json();

    if (data.success) {
      showToast(isEdit ? '✅ Notice updated!' : '✅ Notice published!', 'success');
      document.getElementById('noticeForm').classList.add('hidden');
      editingNoticeId = null;
      await loadNotices();
    } else {
      showToast('Error: ' + data.message, 'error');
    }
  } catch (e) {
    showToast('Network error', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editingNoticeId ? 'Update Notice' : 'Publish Notice';
  }
});

function editNotice(id) {
  const n = allNotices.find(x => x._id === id);
  if (!n) return;
  editingNoticeId = id;
  document.getElementById('noticeFormTitle').textContent = 'Edit Notice';
  document.getElementById('noticeTitle').value  = n.title;
  document.getElementById('noticeBody').value   = n.body;
  document.getElementById('noticeTag').value    = n.tag;
  document.getElementById('noticeUrgent').checked = n.isUrgent;
  document.getElementById('editNoticeId').value = id;
  document.getElementById('submitNotice').textContent = 'Update Notice';
  document.getElementById('noticeForm').classList.remove('hidden');
  document.getElementById('noticeTitle').focus();
  document.getElementById('noticeForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteNotice(id) {
  if (!confirm('Delete this notice? This cannot be undone.')) return;
  try {
    const res  = await fetch(`${API_BASE}/notices/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { showToast('🗑 Notice deleted', 'success'); await loadNotices(); }
    else showToast('Error: ' + data.message, 'error');
  } catch (e) { showToast('Network error', 'error'); }
}

function viewNotice(id) {
  const n = allNotices.find(x => x._id === id);
  if (!n) return;
  showModal(`
    <h2 class="modal-title">📢 Notice Detail</h2>
    <div class="detail-grid">
      <div class="detail-item detail-full"><div class="detail-label">Title</div><div class="detail-value" style="font-size:16px;font-weight:700">${n.title}</div></div>
      <div class="detail-item"><div class="detail-label">Tag</div><div class="detail-value"><span class="status-badge badge-${n.tag}">${n.tag}</span></div></div>
      <div class="detail-item"><div class="detail-label">Urgent</div><div class="detail-value">${n.isUrgent ? '🔴 Yes' : 'No'}</div></div>
      <div class="detail-item"><div class="detail-label">Published</div><div class="detail-value">${fmtDate(n.publishedAt || n.createdAt)}</div></div>
      <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="status-badge badge-${n.isPublished ? 'published' : 'draft'}">${n.isPublished ? 'Published' : 'Draft'}</span></div></div>
      <div class="detail-item detail-full"><div class="detail-label">Content</div><div class="detail-value" style="line-height:1.7">${n.body}</div></div>
    </div>
  `);
}

// ─── ADMISSIONS ───────────────────────────────
async function loadAdmissions() {
  try {
    const res  = await fetch(`${API_BASE}/admission`);
    const data = await res.json();
    allAdmissions = data.success ? data.data : [];
    renderAdmissionsTable(allAdmissions);
    const total   = allAdmissions.length;
    const pending = allAdmissions.filter(a => a.status === 'pending').length;
    document.getElementById('stat-admissions').textContent = total;
    document.getElementById('stat-pending').textContent    = pending;
    updateBadge('admissions', pending);
  } catch (e) {
    document.getElementById('admissionsBody').innerHTML =
      '<tr><td colspan="8" class="loading-row">⚠️ Failed to load admissions</td></tr>';
  }
}

function renderAdmissionsTable(admissions) {
  const tbody = document.getElementById('admissionsBody');
  if (!admissions.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No admissions found</td></tr>'; return;
  }
  tbody.innerHTML = admissions.map(a => `
    <tr>
      <td style="font-weight:600">${a.childName}</td>
      <td>${a.parentName}</td>
      <td style="text-align:center"><strong>Class ${a.applyingForClass}</strong></td>
      <td><a href="tel:${a.phone}" style="color:var(--gold);text-decoration:none;font-family:'Playfair Display',sans-serif;font-size:13px">${a.phone}</a></td>
      <td style="text-align:center">${a.distanceFromSchoolKm != null ? a.distanceFromSchoolKm + ' km' : '—'}</td>
      <td style="white-space:nowrap">${fmtDate(a.createdAt)}</td>
      <td><span class="status-badge badge-${a.status}">${fmtStatus(a.status)}</span></td>
      <td>
        <div class="action-btns">
          <button class="act-btn" onclick="viewAdmission('${a._id}')">👁 View</button>
          <button class="act-btn success" onclick="updateAdmissionStatus('${a._id}','approved')">✅</button>
          <button class="act-btn" onclick="updateAdmissionStatus('${a._id}','under_review')">🔍</button>
          <button class="act-btn danger" onclick="updateAdmissionStatus('${a._id}','rejected')">❌</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Filter admissions
document.querySelectorAll('#section-admissions .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#section-admissions .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    renderAdmissionsTable(f === 'all' ? allAdmissions : allAdmissions.filter(a => a.status === f));
  });
});

async function updateAdmissionStatus(id, status) {
  try {
    const res  = await fetch(`${API_BASE}/admission/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`✅ Status updated to ${fmtStatus(status)}`, 'success');
      await loadAdmissions();
    } else showToast('Error: ' + data.message, 'error');
  } catch (e) { showToast('Network error', 'error'); }
}

function viewAdmission(id) {
  const a = allAdmissions.find(x => x._id === id);
  if (!a) return;
  showModal(`
    <h2 class="modal-title">🎓 Admission Detail</h2>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">Child Name</div><div class="detail-value">${a.childName}</div></div>
      <div class="detail-item"><div class="detail-label">Applying For</div><div class="detail-value">Class ${a.applyingForClass}</div></div>
      <div class="detail-item"><div class="detail-label">Parent Name</div><div class="detail-value">${a.parentName}</div></div>
      <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value"><a href="tel:${a.phone}" style="color:var(--gold)">${a.phone}</a></div></div>
      <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value"><a href="mailto:${a.email}" style="color:var(--gold)">${a.email}</a></div></div>
      <div class="detail-item"><div class="detail-label">Distance</div><div class="detail-value">${a.distanceFromSchoolKm != null ? a.distanceFromSchoolKm + ' km' : '—'} ${a.locationCleared ? '✅' : '❌'}</div></div>
      <div class="detail-item detail-full"><div class="detail-label">Address</div><div class="detail-value">${a.address}</div></div>
      <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="status-badge badge-${a.status}">${fmtStatus(a.status)}</span></div></div>
      <div class="detail-item"><div class="detail-label">Submitted</div><div class="detail-value">${fmtDate(a.createdAt)}</div></div>
      <div class="detail-item detail-full"><div class="detail-label">Reference ID</div><div class="detail-value" style="font-family:'JetBrains Mono',monospace;font-size:12px">${a._id}</div></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="act-btn success" style="flex:1;padding:10px" onclick="updateAdmissionStatus('${a._id}','approved');closeModal()">✅ Approve</button>
      <button class="act-btn" style="flex:1;padding:10px" onclick="updateAdmissionStatus('${a._id}','under_review');closeModal()">🔍 Under Review</button>
      <button class="act-btn danger" style="flex:1;padding:10px" onclick="updateAdmissionStatus('${a._id}','rejected');closeModal()">❌ Reject</button>
    </div>
  `);
}

// ─── CONTACTS ────────────────────────────────
async function loadContacts() {
  try {
    const res  = await fetch(`${API_BASE}/contact`);
    const data = await res.json();
    allContacts = data.success ? data.data : [];
    renderContactsTable(allContacts);
    const unread = allContacts.filter(c => c.status === 'unread').length;
    document.getElementById('stat-contacts').textContent = allContacts.length;
    updateBadge('contacts', unread);
  } catch (e) {
    document.getElementById('contactsBody').innerHTML =
      '<tr><td colspan="6" class="loading-row">⚠️ Failed to load messages</td></tr>';
  }
}

function renderContactsTable(contacts) {
  const tbody = document.getElementById('contactsBody');
  if (!contacts.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">No messages found</td></tr>'; return;
  }
  tbody.innerHTML = contacts.map(c => `
    <tr style="${c.status === 'unread' ? 'background:rgba(240,192,64,0.04)' : ''}">
      <td style="font-weight:${c.status === 'unread' ? '700' : '400'}">${c.name}</td>
      <td><a href="mailto:${c.email}" style="color:var(--gold);text-decoration:none">${c.email}</a></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.subject}">${c.subject}</td>
      <td style="white-space:nowrap">${fmtDate(c.createdAt)}</td>
      <td><span class="status-badge badge-${c.status}">${c.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="act-btn" onclick="viewContact('${c._id}')">👁 View</button>
          <button class="act-btn success" onclick="updateContactStatus('${c._id}','replied')">✅ Replied</button>
          <button class="act-btn" onclick="updateContactStatus('${c._id}','read')">📖 Read</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Filter contacts
document.querySelectorAll('#section-contacts .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#section-contacts .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    renderContactsTable(f === 'all' ? allContacts : allContacts.filter(c => c.status === f));
  });
});

async function updateContactStatus(id, status) {
  try {
    const res  = await fetch(`${API_BASE}/contact/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) { showToast(`✅ Marked as ${status}`, 'success'); await loadContacts(); }
    else showToast('Error: ' + data.message, 'error');
  } catch (e) { showToast('Network error', 'error'); }
}

function viewContact(id) {
  const c = allContacts.find(x => x._id === id);
  if (!c) return;
  // Auto-mark as read
  if (c.status === 'unread') updateContactStatus(id, 'read');
  showModal(`
    <h2 class="modal-title">✉️ Message Detail</h2>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">From</div><div class="detail-value">${c.name}</div></div>
      <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="status-badge badge-${c.status}">${c.status}</span></div></div>
      <div class="detail-item detail-full"><div class="detail-label">Email</div><div class="detail-value"><a href="mailto:${c.email}" style="color:var(--gold)">${c.email}</a></div></div>
      <div class="detail-item detail-full"><div class="detail-label">Subject</div><div class="detail-value" style="font-weight:600">${c.subject}</div></div>
      <div class="detail-item detail-full"><div class="detail-label">Message</div><div class="detail-value" style="line-height:1.8">${c.message}</div></div>
      <div class="detail-item"><div class="detail-label">Received</div><div class="detail-value">${fmtDate(c.createdAt)}</div></div>
      <div class="detail-item"><div class="detail-label">ID</div><div class="detail-value" style="font-family:'JetBrains Mono',monospace;font-size:11px">${c._id}</div></div>
    </div>
    <div style="margin-top:20px">
      <a href="mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject)}" 
         style="display:inline-block;background:var(--gold);color:var(--bg);padding:11px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px"
         onclick="updateContactStatus('${c._id}','replied')">
        📧 Reply via Email
      </a>
    </div>
  `);
}

// ─── OVERVIEW ────────────────────────────────
function renderOverview() {
  // Recent admissions
  const ra = document.getElementById('recentAdmissions');
  const recent5adm = allAdmissions.slice(0, 5);
  ra.innerHTML = recent5adm.length ? recent5adm.map(a => `
    <div class="recent-item" onclick="switchSection('admissions')" style="cursor:pointer">
      <div class="recent-item-name">${a.childName} <span style="color:var(--text-mid);font-weight:400">→ Class ${a.applyingForClass}</span></div>
      <div class="recent-item-sub">${a.parentName} · ${fmtDate(a.createdAt)} · <span class="status-badge badge-${a.status}" style="font-size:10px">${fmtStatus(a.status)}</span></div>
    </div>
  `).join('') : '<p style="color:var(--text-mid);font-size:13px">No admissions yet</p>';

  // Recent contacts
  const rc = document.getElementById('recentContacts');
  const recent5con = allContacts.slice(0, 5);
  rc.innerHTML = recent5con.length ? recent5con.map(c => `
    <div class="recent-item" onclick="switchSection('contacts')" style="cursor:pointer">
      <div class="recent-item-name" style="${c.status === 'unread' ? 'color:var(--gold)' : ''}">${c.name} <span style="color:var(--text-mid);font-weight:400">— ${c.subject.substring(0,30)}${c.subject.length>30?'...':''}</span></div>
      <div class="recent-item-sub">${c.email} · ${fmtDate(c.createdAt)} · <span class="status-badge badge-${c.status}" style="font-size:10px">${c.status}</span></div>
    </div>
  `).join('') : '<p style="color:var(--text-mid);font-size:13px">No messages yet</p>';
}

// ─── MODAL ────────────────────────────────────
function showModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('detailModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('detailModal').classList.add('hidden');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('detailModal').addEventListener('click', e => {
  if (e.target === document.getElementById('detailModal')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── TOAST ────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ─── BADGE ────────────────────────────────────
function updateBadge(section, count) {
  const badge = document.getElementById('badge-' + section);
  if (count > 0) {
    badge.textContent = count;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

// ─── HELPERS ─────────────────────────────────
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
  });
}

function fmtStatus(s) {
  return { pending: 'Pending', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected' }[s] || s;
}
