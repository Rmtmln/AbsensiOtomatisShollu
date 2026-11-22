// ==================== THEME ====================
function initTheme() {
  const saved = localStorage.getItem('shollu-theme') || 'dark';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('shollu-theme', next);
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const icon = theme === 'light' ? '🌙' : '☀️';
  const headerBtn = document.getElementById('headerThemeBtn');
  const authBtn = document.getElementById('authThemeBtn');
  if (headerBtn) headerBtn.textContent = icon;
  if (authBtn) authBtn.textContent = icon;
}

// Initialize theme immediately
initTheme();

// ==================== STATE ====================
let allAccountsActive = true;

// ==================== AUTH LOGIC ====================
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    if (data.success) {
      document.body.classList.remove('auth-hidden');
      document.getElementById('authOverlay').style.display = 'none';
      initApp();
    } else {
      document.body.classList.add('auth-hidden');
      document.getElementById('authOverlay').style.display = 'flex';
    }
  } catch (err) {
    console.error('Auth check failed:', err);
  }
}

function showAuth(type) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (type === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
}

// Global API Fetch Wrapper
async function fetchApi(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    location.reload();
    return null;
  }
  return res;
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Login...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Login berhasil!', 'success');
        checkAuth();
      } else {
        showToast(data.error || 'Login gagal', 'error');
      }
    } catch (err) {
      showToast('Gagal terhubung ke server', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUser').value;
    const password = document.getElementById('regPass').value;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Mendaftar...';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        showAuth('login');
      } else {
        showToast(data.error || 'Registrasi gagal', 'error');
      }
    } catch (err) {
      showToast('Gagal terhubung ke server', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Daftar';
    }
  });

  // Keyboard: Escape to close sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebar();
    }
  });
});

function initApp() {
  updateClock();
  setInterval(updateClock, 1000);
  showSkeletonLoading();
  loadAccounts();
  loadStatus();
  loadLogs();
  setInterval(loadStatus, 30000);
  setInterval(loadLogs, 30000);
}

// ==================== SKELETON LOADING ====================
function showSkeletonLoading() {
  const grid = document.getElementById('accountsGrid');
  grid.innerHTML = `
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  `;
}

// ==================== CLOCK ====================
function updateClock() {
  const now = new Date();
  const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const h = String(wib.getHours()).padStart(2, '0');
  const m = String(wib.getMinutes()).padStart(2, '0');
  const s = String(wib.getSeconds()).padStart(2, '0');
  document.getElementById('clockDisplay').textContent = `${h}:${m}:${s} WIB`;
}

// ==================== API HELPERS ====================
async function api(method, url, data = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (data) opts.body = JSON.stringify(data);
  const res = await fetchApi(url, opts);
  if (!res) return { success: false, error: 'Unauthorized' };
  return res.json();
}

// ==================== TOAST ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3700);
}

// ==================== MODAL ====================
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function openAddAccountModal() {
  document.getElementById('newUsername').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('newMesinId').value = '1101932';
  document.getElementById('newApiKey').value = 'shollusemakindidepan';
  document.getElementById('newAbsenCode').value = '';
  document.getElementById('newCodeLabel').value = '';
  const loginResult = document.getElementById('loginStatusResult');
  loginResult.style.display = 'none';
  loginResult.innerHTML = '';
  openModal('addAccountModal');
}

// ==================== SIDEBAR DRAWER ====================
function toggleSidebar() {
  const drawer = document.getElementById('sidebarDrawer');
  const overlay = document.getElementById('sidebarOverlay');
  const isActive = drawer.classList.contains('active');

  if (isActive) {
    closeSidebar();
  } else {
    drawer.classList.add('active');
    overlay.classList.add('active');
    // Load content for active tab
    const activeTab = document.querySelector('.sidebar-tab.active');
    if (activeTab) {
      const tab = activeTab.dataset.tab;
      if (tab === 'logs') loadLogs();
      else if (tab === 'scheduler') loadStatus();
      else if (tab === 'prayer-settings') loadPrayerSettings();
    }
  }
}

function closeSidebar() {
  document.getElementById('sidebarDrawer').classList.remove('active');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

function switchSidebarTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.sidebar-tab[data-tab="${tabName}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.sidebar-tab-content').forEach(c => c.classList.remove('active'));

  if (tabName === 'logs') {
    document.getElementById('tabLogs').classList.add('active');
    loadLogs();
  } else if (tabName === 'scheduler') {
    document.getElementById('tabScheduler').classList.add('active');
    loadStatus();
  } else if (tabName === 'prayer-settings') {
    document.getElementById('tabPrayerSettings').classList.add('active');
    loadPrayerSettings();
  }
}

// ==================== ACCOUNTS ====================
async function loadAccounts() {
  try {
    const res = await api('GET', '/api/accounts');
    if (!res.success) throw new Error(res.error);
    renderAccounts(res.data);
  } catch (err) {
    showToast('Gagal memuat akun: ' + err.message, 'error');
  }
}

function renderAccounts(accounts) {
  const grid = document.getElementById('accountsGrid');
  document.getElementById('accountCount').textContent = accounts.length;

  if (accounts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🕌</div>
        <p>Belum ada akun. Klik "Tambah Akun" untuk mulai.</p>
      </div>`;
    return;
  }

  grid.innerHTML = accounts.map(acc => {
    const schedules = acc.schedules || [];
    const codes = acc.codes || [];
    const isActive = acc.is_active;
    const avatarLetter = acc.username.charAt(0).toUpperCase();

    return `
      <div class="account-card ${!isActive ? 'inactive' : ''}" data-id="${acc.id}">
        <div class="card-header">
          <div class="card-header-left">
            <div class="account-avatar">${avatarLetter}</div>
            <div class="account-info">
              <h3>${escapeHtml(acc.username)}</h3>
              <p>Mesin: ${escapeHtml(acc.mesin_id)} | API: ${acc.api_key ? escapeHtml(acc.api_key.substring(0, 8)) + '...' : 'default'}</p>
              <span class="login-badge" id="loginBadge_${acc.id}">🔄 Belum diverifikasi</span>
            </div>
          </div>
          <div class="card-header-right">
            <span style="font-size:11px; color: ${isActive ? 'var(--green)' : 'var(--red)'}; font-weight:600;">
              ${isActive ? '● AKTIF' : '● MATI'}
            </span>
            <label class="toggle-switch">
              <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleAccount(${acc.id}, this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="card-body">
          <!-- Schedule Toggles -->
          <div class="schedule-toggles">
            ${['subuh', 'zuhur', 'ashar', 'maghrib', 'isya', 'tarawih'].map(prayer => {
      const sch = schedules.find(s => s.prayer === prayer);
      const active = sch ? sch.is_active : 0;
      const icons = { subuh: '🌅', zuhur: '☀️', ashar: '🌤️', maghrib: '🌇', isya: '🌙', tarawih: '🌃' };
      return `
                <div class="schedule-toggle ${active ? 'active' : ''}">
                  <span class="prayer-name">${icons[prayer]} ${prayer}</span>
                  <label class="mini-toggle">
                    <input type="checkbox" ${active ? 'checked' : ''} onchange="toggleSchedule(${acc.id}, '${prayer}', this.checked, this)">
                    <span class="mini-slider"></span>
                  </label>
                </div>`;
    }).join('')}
          </div>

          <!-- Absen Codes -->
          <div class="codes-section">
            <div class="codes-label">🔑 Kode Absen</div>
            <div class="code-tags">
              ${codes.map(c => `
                <span class="code-tag">
                  <span>${escapeHtml(c.code)}</span>
                  ${c.label ? `<span class="code-label">(${escapeHtml(c.label)})</span>` : ''}
                  <button class="delete-code" onclick="deleteCode(${c.id})" title="Hapus kode">×</button>
                </span>
              `).join('')}
              <button class="add-code-inline" onclick="openAddCodeModal(${acc.id})">
                + Tambah Kode
              </button>
            </div>
          </div>

          <div class="card-actions">
            <button class="btn btn-success btn-sm" onclick="openManualAbsenModal(${acc.id})">
              📤 Absen Manual
            </button>
            <button class="btn btn-outline btn-sm" onclick="testAccountLogin(${acc.id})" id="btnTestLogin_${acc.id}">
              🔐 Test Login
            </button>
            <button class="btn btn-outline btn-sm" onclick="openEditAccountModal(${acc.id}, '${escapeHtml(acc.username).replace(/'/g, "\\'")}', '${escapeHtml(acc.mesin_id)}', '${escapeHtml(acc.api_key)}')">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteAccount(${acc.id}, this)">
              🗑️ Hapus
            </button>
          </div>

          <!-- Last Status -->
          <div class="last-status" id="lastStatus_${acc.id}">
            Belum ada aktivitas
          </div>
        </div>
      </div>`;
  }).join('');

  // Load last status for each account
  accounts.forEach(acc => loadLastStatus(acc.id));
}

async function saveNewAccount() {
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value.trim();
  const mesinId = document.getElementById('newMesinId').value.trim();
  const apiKey = document.getElementById('newApiKey').value.trim();
  const code = document.getElementById('newAbsenCode').value.trim();
  const label = document.getElementById('newCodeLabel').value.trim();

  if (!username || !password) {
    showToast('Username dan password wajib diisi!', 'error');
    return;
  }

  const btn = document.getElementById('btnSaveAccount');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Menyimpan & Verifikasi...';
  const loginResult = document.getElementById('loginStatusResult');
  loginResult.style.display = 'none';

  try {
    const data = { username, password, mesin_id: mesinId, api_key: apiKey };
    if (code) {
      data.codes = [{ code, label }];
    }
    const res = await api('POST', '/api/accounts', data);
    if (!res.success) throw new Error(res.error);

    // Show login verification result
    if (res.loginStatus) {
      const ls = res.loginStatus;
      loginResult.style.display = 'block';
      loginResult.className = `login-status-box ${ls.success ? 'login-ok' : 'login-fail'}`;
      loginResult.innerHTML = `<strong>${escapeHtml(ls.message)}</strong>`;
    }

    showToast('Akun berhasil ditambahkan!', 'success');
    if (res.loginStatus && res.loginStatus.success) {
      showToast(res.loginStatus.message, 'success');
    } else if (res.loginStatus) {
      showToast(res.loginStatus.message, 'error');
    }

    setTimeout(() => {
      closeModal('addAccountModal');
      loadAccounts();
    }, 2000);
  } catch (err) {
    showToast('Gagal menambah akun: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Simpan';
  }
}

function openEditAccountModal(id, username, mesinId, apiKey) {
  document.getElementById('editAccountId').value = id;
  document.getElementById('editUsername').value = username;
  document.getElementById('editPassword').value = '';
  document.getElementById('editMesinId').value = mesinId || '1101932';
  document.getElementById('editApiKey').value = apiKey;
  openModal('editAccountModal');
}

async function saveEditAccount() {
  const id = document.getElementById('editAccountId').value;
  const username = document.getElementById('editUsername').value.trim();
  const password = document.getElementById('editPassword').value.trim();
  const mesinId = document.getElementById('editMesinId').value.trim();
  const apiKey = document.getElementById('editApiKey').value.trim();

  const btn = document.querySelector('#editAccountModal .btn-success');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Menyimpan...';

  try {
    const data = { username, mesin_id: mesinId, api_key: apiKey };
    if (password) data.password = password;
    const res = await api('PUT', `/api/accounts/${id}`, data);
    if (!res.success) throw new Error(res.error);

    showToast('Akun berhasil diupdate!', 'success');
    closeModal('editAccountModal');
    loadAccounts();
  } catch (err) {
    showToast('Gagal update akun: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Simpan';
  }
}

async function deleteAccount(id, btnEl) {
  if (btnEl && !btnEl.dataset.confirming) {
    btnEl.dataset.confirming = 'true';
    btnEl.innerHTML = '⚠️ Yakin?';
    btnEl.style.animation = 'pulse 1s infinite';
    setTimeout(() => {
      if (btnEl) {
        delete btnEl.dataset.confirming;
        btnEl.innerHTML = '🗑️ Hapus';
        btnEl.style.animation = '';
      }
    }, 3000);
    return;
  }

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '<span class="loading-spinner"></span>';
  }

  try {
    const res = await api('DELETE', `/api/accounts/${id}`);
    if (!res.success) throw new Error(res.error);
    showToast('Akun berhasil dihapus', 'success');
    loadAccounts();
  } catch (err) {
    showToast('Gagal hapus akun: ' + err.message, 'error');
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = '🗑️ Hapus';
      delete btnEl.dataset.confirming;
    }
  }
}

async function toggleAccount(id, isActive) {
  try {
    const res = await api('PUT', `/api/accounts/${id}/toggle`, { is_active: isActive });
    if (!res.success) throw new Error(res.error);
    showToast(res.message, 'success');
    loadAccounts();
  } catch (err) {
    showToast('Gagal toggle akun: ' + err.message, 'error');
  }
}

async function toggleAllBots() {
  allAccountsActive = !allAccountsActive;
  const btn = document.getElementById('killSwitch');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span>';

  try {
    const res = await api('PUT', '/api/accounts/toggle-all', { is_active: allAccountsActive });
    if (!res.success) throw new Error(res.error);
    showToast(res.message, allAccountsActive ? 'success' : 'info');
    updateKillSwitch();
    loadAccounts();
  } catch (err) {
    showToast('Gagal toggle semua: ' + err.message, 'error');
    allAccountsActive = !allAccountsActive; // Revert
  } finally {
    btn.disabled = false;
    updateKillSwitch();
  }
}

function updateKillSwitch() {
  const btn = document.getElementById('killSwitch');
  if (allAccountsActive) {
    btn.className = 'btn kill-switch active-all';
    btn.innerHTML = '✅ Semua Aktif';
  } else {
    btn.className = 'btn kill-switch';
    btn.innerHTML = '⛔ Nonaktifkan Semua';
  }
}

// ==================== SCHEDULES ====================
async function toggleSchedule(accountId, prayer, isActive, el) {
  try {
    const res = await api('PUT', `/api/accounts/${accountId}/schedules`, { prayer, is_active: isActive });
    if (!res.success) throw new Error(res.error);

    const toggle = el.closest('.schedule-toggle');
    if (isActive) toggle.classList.add('active');
    else toggle.classList.remove('active');
  } catch (err) {
    showToast('Gagal toggle jadwal: ' + err.message, 'error');
    el.checked = !isActive;
  }
}

// ==================== LOGIN TEST ====================
async function testAccountLogin(accountId) {
  const btn = document.getElementById(`btnTestLogin_${accountId}`);
  const badge = document.getElementById(`loginBadge_${accountId}`);

  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Testing...';
  if (badge) {
    badge.textContent = '⏳ Memverifikasi...';
    badge.className = 'login-badge';
  }

  try {
    const res = await api('POST', `/api/accounts/${accountId}/test-login`);
    if (!res.success) throw new Error(res.error);

    const result = res.data;
    if (badge) {
      badge.textContent = result.message;
      badge.className = `login-badge ${result.success ? 'verified' : 'failed'}`;
    }
    showToast(result.message, result.success ? 'success' : 'error');
  } catch (err) {
    if (badge) {
      badge.textContent = '⚠️ Error: ' + err.message;
      badge.className = 'login-badge failed';
    }
    showToast('Gagal test login: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔐 Test Login';
  }
}

// ==================== CODES ====================
function openAddCodeModal(accountId) {
  document.getElementById('addCodeAccountId').value = accountId;
  document.getElementById('addCodeValue').value = '';
  document.getElementById('addCodeLabel').value = '';
  openModal('addCodeModal');
}

async function saveNewCode() {
  const accountId = document.getElementById('addCodeAccountId').value;
  const code = document.getElementById('addCodeValue').value.trim();
  const label = document.getElementById('addCodeLabel').value.trim();

  if (!code) {
    showToast('Kode absen wajib diisi!', 'error');
    return;
  }

  const btn = document.querySelector('#addCodeModal .btn-success');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Menambahkan...';

  try {
    const res = await api('POST', `/api/accounts/${accountId}/codes`, { code, label });
    if (!res.success) throw new Error(res.error);
    showToast('Kode absen berhasil ditambahkan!', 'success');
    closeModal('addCodeModal');
    loadAccounts();
  } catch (err) {
    showToast('Gagal tambah kode: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Tambah';
  }
}

async function deleteCode(codeId) {
  if (!confirm('Hapus kode absen ini?')) return;
  try {
    const res = await api('DELETE', `/api/codes/${codeId}`);
    if (!res.success) throw new Error(res.error);
    showToast('Kode dihapus', 'success');
    loadAccounts();
  } catch (err) {
    showToast('Gagal hapus kode: ' + err.message, 'error');
  }
}

// ==================== MANUAL ABSEN ====================
function openManualAbsenModal(accountId) {
  document.getElementById('manualAbsenAccountId').value = accountId;
  // Reset to form view
  document.getElementById('manualAbsenForm').style.display = 'block';
  document.getElementById('manualAbsenProgress').style.display = 'none';
  openModal('manualAbsenModal');
}

function closeManualAbsenProgress() {
  closeModal('manualAbsenModal');
  // Reset views
  document.getElementById('manualAbsenForm').style.display = 'block';
  document.getElementById('manualAbsenProgress').style.display = 'none';
  loadLogs();
  loadAccounts();
}

async function executeManualAbsen() {
  const accountId = document.getElementById('manualAbsenAccountId').value;

  // Switch to progress view
  document.getElementById('manualAbsenForm').style.display = 'none';
  document.getElementById('manualAbsenProgress').style.display = 'block';
  document.getElementById('progressTitle').textContent = '🔐 Login & mengirim absen...';
  document.getElementById('progressCount').textContent = '⏳';
  document.getElementById('progressBarFill').style.width = '10%';
  document.getElementById('progressResults').innerHTML = `
    <div class="progress-item" style="border-left-color: var(--amber);">
      <span class="icon"><span class="loading-spinner"></span></span>
      <span class="result">Menghubungkan ke server Shollu...</span>
    </div>
  `;
  document.getElementById('btnCloseProgress').style.display = 'none';

  try {
    const res = await api('POST', `/api/accounts/${accountId}/absen-manual`);
    if (!res.success) throw new Error(res.error);

    const results = res.data;
    const total = results.length;

    // Update progress
    document.getElementById('progressTitle').textContent = 'Selesai!';
    document.getElementById('progressCount').textContent = `${total}/${total}`;
    document.getElementById('progressBarFill').style.width = '100%';

    // Show results
    const successCount = results.filter(r => r.success).length;
    const failCount = total - successCount;

    let html = '';
    results.forEach((r, i) => {
      const icon = r.success ? '✅' : '❌';
      const statusClass = r.success ? 'success' : 'failed';
      const labelText = r.label ? ` (${escapeHtml(r.label)})` : '';
      html += `
        <div class="progress-item ${statusClass}">
          <span class="icon">${icon}</span>
          <span class="code">${escapeHtml(r.code)}${labelText}</span>
          <span class="result">${escapeHtml(r.status)}</span>
        </div>
      `;
    });

    // Summary
    html += `
      <div style="margin-top: 8px; padding: 10px 14px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 12px; text-align: center;">
        <span style="color: var(--green);">✅ ${successCount} berhasil</span>
        ${failCount > 0 ? `<span style="margin-left: 12px; color: var(--red);">❌ ${failCount} gagal</span>` : ''}
      </div>
    `;

    document.getElementById('progressResults').innerHTML = html;
    document.getElementById('btnCloseProgress').style.display = 'inline-flex';

    // Toasts
    if (successCount > 0) showToast(`${successCount} absen berhasil dikirim!`, 'success');
    if (failCount > 0) showToast(`${failCount} absen gagal`, 'error');

    loadLastStatus(parseInt(accountId));
  } catch (err) {
    document.getElementById('progressTitle').textContent = '❌ Gagal';
    document.getElementById('progressBarFill').style.width = '100%';
    document.getElementById('progressResults').innerHTML = `
      <div class="progress-item failed">
        <span class="icon">❌</span>
        <span class="result">${escapeHtml(err.message)}</span>
      </div>
    `;
    document.getElementById('btnCloseProgress').style.display = 'inline-flex';
    showToast('Gagal absen manual: ' + err.message, 'error');
  }
}

// ==================== LOGS ====================
async function loadLogs() {
  try {
    const res = await api('GET', '/api/logs?limit=50');
    if (!res.success) throw new Error(res.error);
    renderLogs(res.data);
  } catch (err) {
    console.error('Failed to load logs:', err);
  }
}

function refreshLogs() {
  const btns = document.querySelectorAll('.sidebar-tab-toolbar .btn-outline');
  btns.forEach(btn => {
    if (btn.textContent.includes('Refresh')) {
      btn.innerHTML = '<span class="loading-spinner"></span>';
      btn.disabled = true;
      setTimeout(() => { btn.innerHTML = '↻ Refresh'; btn.disabled = false; }, 1000);
    }
  });
  loadLogs();
  showToast('Log diperbarui', 'info');
}

async function clearAllLogs() {
  if (!confirm('Hapus SEMUA log aktivitas? Tindakan ini tidak bisa dibatalkan.')) return;
  try {
    const res = await api('DELETE', '/api/logs');
    if (!res.success) throw new Error(res.error);
    showToast('Semua log berhasil dihapus', 'success');
    loadLogs();
  } catch (err) {
    showToast('Gagal hapus log: ' + err.message, 'error');
  }
}

async function deleteLog(logId) {
  try {
    const res = await api('DELETE', `/api/logs/${logId}`);
    if (!res.success) throw new Error(res.error);
    showToast('Log dihapus', 'success');
    loadLogs();
  } catch (err) {
    showToast('Gagal hapus log: ' + err.message, 'error');
  }
}

function renderLogs(logs) {
  const container = document.getElementById('logsContainer');

  if (logs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="emoji">📋</div>
        <p>Belum ada log absensi.</p>
      </div>`;
    return;
  }

  container.innerHTML = logs.map(log => {
    let responseText = '';
    try {
      const parsed = JSON.parse(log.response);
      if (typeof parsed === 'string') {
        responseText = parsed;
      } else if (parsed && typeof parsed === 'object') {
        responseText = parsed.message || parsed.status || parsed.msg || parsed.error || JSON.stringify(parsed);
      }
    } catch {
      responseText = log.response || '';
    }

    return `
      <div class="log-item">
        <div class="log-header">
          <span class="log-user">${escapeHtml(log.username || 'Unknown')}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="log-time">${formatTimestamp(log.timestamp)}</span>
            <button onclick="deleteLog(${log.id})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;opacity:0.4;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.4" title="Hapus log">×</button>
          </div>
        </div>
        <div class="log-detail">
          <span class="log-prayer ${log.prayer}">${log.prayer.toUpperCase()}</span>
          <span style="color:var(--text-muted); font-size:11px; font-family:monospace;">${escapeHtml(log.code)}</span>
          <span class="log-status ${log.status}">${log.status === 'success' ? '✅' : '❌'} ${log.status}</span>
        </div>
        ${responseText ? `<div class="log-response"><strong>Server:</strong> ${escapeHtml(responseText)}</div>` : ''}
      </div>`;
  }).join('');
}

async function loadLastStatus(accountId) {
  try {
    const res = await api('GET', `/api/accounts/${accountId}/logs`);
    if (!res.success || !res.data.length) return;

    const last = res.data[0];
    const el = document.getElementById(`lastStatus_${accountId}`);
    if (!el) return;

    let responseText = '';
    try {
      const parsed = JSON.parse(last.response);
      if (typeof parsed === 'string') {
        responseText = parsed;
      } else if (parsed && typeof parsed === 'object') {
        responseText = parsed.message || parsed.status || parsed.msg || parsed.error || JSON.stringify(parsed);
      }
    } catch {
      responseText = last.response || '';
    }

    el.className = `last-status ${last.status}`;
    el.innerHTML = `
      <strong>${last.status === 'success' ? '✅' : '❌'} ${last.prayer.toUpperCase()}</strong>
      — ${escapeHtml(responseText)}
      <span style="float:right; font-size:10px; color:var(--text-muted)">${formatTimestamp(last.timestamp)}</span>
    `;
  } catch (err) {
    // Silent
  }
}

// ==================== STATUS ====================
async function loadStatus() {
  try {
    const res = await api('GET', '/api/status');
    if (!res.success) throw new Error(res.error);
    renderStatus(res.data);
  } catch (err) {
    console.error('Failed to load status:', err);
  }
}

function renderStatus(status) {
  const label = document.getElementById('currentPrayerLabel');
  if (status.currentPrayer) {
    label.textContent = `• ${status.currentPrayer.toUpperCase()}`;
  } else {
    label.textContent = '';
  }

  const grid = document.getElementById('prayerStatusGrid');
  const icons = { subuh: '🌅', zuhur: '☀️', ashar: '🌤️', maghrib: '🌇', isya: '🌙', tarawih: '🌃' };

  grid.innerHTML = status.prayers.map(p => `
    <div class="prayer-status-item ${p.status}">
      <span class="dot"></span>
      <span>${icons[p.prayer] || ''} ${p.prayer.charAt(0).toUpperCase() + p.prayer.slice(1)}</span>
      <span class="time">${p.window}</span>
    </div>
  `).join('');

  const info = document.getElementById('schedulerInfo');
  const scheduled = status.scheduledExecutions || [];

  info.innerHTML = `
    <div style="font-size:12px; margin-bottom:8px; padding: 12px 20px;">
      <span style="color: ${status.active ? 'var(--green)' : 'var(--red)'}; font-weight:700;">
        ${status.active ? '● Scheduler Aktif' : '● Scheduler Mati'}
      </span>
    </div>
    <div style="font-size:11px; color:var(--text-muted); padding: 0 20px 12px;">
      📅 ${status.currentDate} — ${status.currentTime}
    </div>
    ${scheduled.length > 0 ? `
      <div style="font-size:11px; color:var(--text-secondary); padding: 0 20px 16px;">
        <strong>Jadwal berikutnya:</strong>
        ${scheduled.map(s => `<div style="margin-top:4px;">• ${s.prayer.toUpperCase()} @ ${s.scheduledAt}</div>`).join('')}
      </div>
    ` : '<div style="font-size:11px; color:var(--text-muted); padding: 0 20px 16px;">Tidak ada jadwal yang tertunda</div>'}
  `;
}

// ==================== PRAYER TIME SETTINGS ====================
async function loadPrayerSettings() {
  const container = document.getElementById('prayerSettingsContainer');
  container.innerHTML = '<div class="empty-state"><p>Memuat pengaturan...</p></div>';

  try {
    const res = await api('GET', '/api/prayer-times');
    if (!res.success) throw new Error(res.error);
    renderPrayerSettings(res.data);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Gagal memuat: ${escapeHtml(err.message)}</p></div>`;
  }
}

function renderPrayerSettings(windows) {
  const container = document.getElementById('prayerSettingsContainer');
  const icons = { subuh: '🌅', zuhur: '☀️', ashar: '🌤️', maghrib: '🌇', isya: '🌙', tarawih: '🌃' };
  const prayers = ['subuh', 'zuhur', 'ashar', 'maghrib', 'isya', 'tarawih'];

  let html = '<div class="prayer-settings-list">';

  prayers.forEach(prayer => {
    const w = windows[prayer];
    if (!w) return;

    html += `
      <div class="prayer-setting-item" data-prayer="${prayer}">
        <div class="prayer-setting-name">${icons[prayer]} ${prayer.charAt(0).toUpperCase() + prayer.slice(1)}</div>
        <div class="prayer-time-inputs">
          <div class="time-input-group">
            <label>Mulai</label>
            <input type="number" class="prayer-startH" value="${w.startH}" min="0" max="23">
            <span class="time-colon">:</span>
            <input type="number" class="prayer-startM" value="${String(w.startM).padStart(2, '0')}" min="0" max="59">
          </div>
          <span class="separator">→</span>
          <div class="time-input-group">
            <label>Selesai</label>
            <input type="number" class="prayer-endH" value="${w.endH}" min="0" max="23">
            <span class="time-colon">:</span>
            <input type="number" class="prayer-endM" value="${String(w.endM).padStart(2, '0')}" min="0" max="59">
          </div>
        </div>
      </div>`;
  });

  html += '</div>';
  html += `
    <div class="prayer-settings-actions">
      <button class="btn btn-success w-100" onclick="savePrayerSettings()">💾 Simpan Pengaturan Waktu</button>
      <p style="font-size:10px; color:var(--text-muted); margin-top:8px; text-align:center;">
        ⚠️ Perubahan bersifat sementara (hilang saat server restart)
      </p>
    </div>`;

  container.innerHTML = html;
}

async function savePrayerSettings() {
  const items = document.querySelectorAll('.prayer-setting-item');
  let successCount = 0;
  let errorMsg = '';

  for (const item of items) {
    const prayer = item.dataset.prayer;
    const startH = parseInt(item.querySelector('.prayer-startH').value);
    const startM = parseInt(item.querySelector('.prayer-startM').value);
    const endH = parseInt(item.querySelector('.prayer-endH').value);
    const endM = parseInt(item.querySelector('.prayer-endM').value);

    try {
      const res = await api('PUT', '/api/prayer-times', { prayer, startH, startM, endH, endM });
      if (res.success) {
        successCount++;
      } else {
        errorMsg = res.error || 'Unknown error';
      }
    } catch (err) {
      errorMsg = err.message;
    }
  }

  if (successCount === items.length) {
    showToast('Semua waktu sholat berhasil diperbarui!', 'success');
    // Refresh status bar to show new times
    loadStatus();
  } else {
    showToast('Gagal menyimpan: ' + errorMsg, 'error');
  }
}

// ==================== HELPERS ====================
function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${mon} ${h}:${m}:${s}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
