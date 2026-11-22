const express = require('express');
const path = require('path');
const database = require('./database');
const scheduler = require('./scheduler');
const { testLogin } = require('./api-client');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'shollu-bot-super-secret-session-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use(express.static(path.join(__dirname, '..', 'public')));

// ==================== AUTH MIDDLEWARE ====================
const authMiddleware = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
    }
};

// ==================== AUTH ROUTES ====================
app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({ success: true, user: { username: req.session.username } });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, error: 'Username dan password wajib' });

        const existing = await database.getUserByUsername(username);
        if (existing) return res.status(400).json({ success: false, error: 'Username sudah digunakan' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await database.createUser(username, hashedPassword);
        res.json({ success: true, message: 'Registrasi berhasil! Silakan tunggu persetujuan admin (manual di DB).' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await database.getUserByUsername(username);

        if (!user) return res.status(401).json({ success: false, error: 'Username atau password salah' });

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ success: false, error: 'Username atau password salah' });

        if (!user.is_approved) {
            return res.status(403).json({ success: false, error: 'Akun Anda belum disetujui oleh admin' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ success: true, message: 'Login berhasil' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ==================== ACCOUNTS ====================
app.get('/api/accounts', authMiddleware, async (req, res) => {
    try {
        const accounts = await database.getAllAccounts();
        // Mask passwords in response
        const masked = accounts.map(acc => ({
            ...acc,
            password: '••••••••',
            _hasPassword: true
        }));
        // Attach codes and schedules
        for (const acc of masked) {
            acc.codes = await database.getCodesForAccount(acc.id);
            acc.schedules = await database.getSchedulesForAccount(acc.id);
        }
        res.json({ success: true, data: masked });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/accounts', authMiddleware, async (req, res) => {
    try {
        const { username, password, mesin_id, api_key, codes } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
        }
        const accountId = await database.createAccount(username, password, mesin_id || '1101932', api_key || 'shollusemakindidepan');

        // Add codes if provided
        if (codes && Array.isArray(codes)) {
            for (const c of codes) {
                await database.addCode(accountId, c.code, c.label || '');
            }
        }

        // Test login credentials
        let loginStatus = null;
        try {
            loginStatus = await testLogin(username, password);

            // Log the login attempt
            const logMsg = loginStatus.success ? `[BERHASIL] Verifikasi login untuk ${username}` : `[GAGAL] Verifikasi login untuk ${username}: ${loginStatus.message}`;
            await database.addLog(accountId, 'login-check', 'SYSTEM', loginStatus.success ? 'success' : 'failed', logMsg);
        } catch (err) {
            loginStatus = { success: false, message: '⚠️ Gagal verifikasi login: ' + err.message };
        }

        res.json({
            success: true,
            id: accountId,
            message: 'Akun berhasil ditambahkan',
            loginStatus
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/accounts/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, mesin_id, api_key } = req.body;
        const existing = await database.getAccount(parseInt(id));
        if (!existing) return res.status(404).json({ success: false, error: 'Akun tidak ditemukan' });

        await database.updateAccount(
            parseInt(id),
            username || existing.username,
            password || existing.password,
            mesin_id || existing.mesin_id,
            api_key || existing.api_key
        );
        res.json({ success: true, message: 'Akun berhasil diupdate' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/accounts/:id', authMiddleware, async (req, res) => {
    try {
        await database.deleteAccount(parseInt(req.params.id));
        res.json({ success: true, message: 'Akun berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/accounts/:id/toggle', authMiddleware, async (req, res) => {
    try {
        const { is_active } = req.body;
        await database.toggleAccount(parseInt(req.params.id), is_active);
        res.json({ success: true, message: is_active ? 'Bot diaktifkan' : 'Bot dinonaktifkan' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/accounts/toggle-all', authMiddleware, async (req, res) => {
    try {
        const { is_active } = req.body;
        await database.toggleAllAccounts(is_active);
        if (!is_active) scheduler.stopScheduler();
        else scheduler.resumeScheduler();
        res.json({ success: true, message: is_active ? 'Semua bot diaktifkan' : 'Semua bot dinonaktifkan' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== LOGIN TEST ====================
app.post('/api/test-credentials', authMiddleware, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
        }
        const result = await testLogin(username, password);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/accounts/:id/test-login', authMiddleware, async (req, res) => {
    try {
        const account = await database.getAccount(parseInt(req.params.id));
        if (!account) return res.status(404).json({ success: false, error: 'Akun tidak ditemukan' });

        const result = await testLogin(account.username, account.password);

        // Log the login test
        const logMsg = result.success
            ? `[BERHASIL] Verifikasi login untuk ${account.username}`
            : `[GAGAL] Verifikasi login untuk ${account.username}: ${result.message}`;
        await database.addLog(account.id, 'login-test', 'SYSTEM', result.success ? 'success' : 'failed', logMsg);

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== ABSEN CODES ====================
app.get('/api/accounts/:id/codes', authMiddleware, async (req, res) => {
    try {
        const codes = await database.getCodesForAccount(parseInt(req.params.id));
        res.json({ success: true, data: codes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/accounts/:id/codes', authMiddleware, async (req, res) => {
    try {
        const { code, label } = req.body;
        if (!code) return res.status(400).json({ success: false, error: 'Kode absen wajib diisi' });
        const codeId = await database.addCode(parseInt(req.params.id), code, label || '');
        res.json({ success: true, id: codeId, message: 'Kode absen berhasil ditambahkan' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/codes/:id', authMiddleware, async (req, res) => {
    try {
        await database.deleteCode(parseInt(req.params.id));
        res.json({ success: true, message: 'Kode absen berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/codes/:id/toggle', authMiddleware, async (req, res) => {
    try {
        const { is_active } = req.body;
        await database.toggleCode(parseInt(req.params.id), is_active);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== SCHEDULES ====================
app.get('/api/accounts/:id/schedules', authMiddleware, async (req, res) => {
    try {
        const schedules = await database.getSchedulesForAccount(parseInt(req.params.id));
        res.json({ success: true, data: schedules });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/accounts/:id/schedules', authMiddleware, async (req, res) => {
    try {
        const { prayer, is_active } = req.body;
        await database.updateSchedule(parseInt(req.params.id), prayer, is_active);
        res.json({ success: true, message: `${prayer} ${is_active ? 'diaktifkan' : 'dinonaktifkan'}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== MANUAL ABSEN ====================
app.post('/api/accounts/:id/absen-manual', authMiddleware, async (req, res) => {
    try {
        // Auto-detect current prayer time, fallback to 'manual'
        const currentPrayer = scheduler.getCurrentPrayer() || 'manual';
        const results = await scheduler.manualAbsen(parseInt(req.params.id), currentPrayer);
        res.json({ success: true, data: results, prayer: currentPrayer });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== LOGS ====================
app.get('/api/logs', authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const logs = await database.getLogs(limit, offset);
        const total = await database.getLogCount();
        res.json({ success: true, data: logs, total });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/accounts/:id/logs', authMiddleware, async (req, res) => {
    try {
        const logs = await database.getLogsForAccount(parseInt(req.params.id));
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/logs/:id', authMiddleware, async (req, res) => {
    try {
        await database.deleteLog(parseInt(req.params.id));
        res.json({ success: true, message: 'Log berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/logs', authMiddleware, async (req, res) => {
    try {
        await database.clearAllLogs();
        res.json({ success: true, message: 'Semua log berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== STATUS ====================
app.get('/api/status', authMiddleware, async (req, res) => {
    try {
        const status = scheduler.getSchedulerStatus();
        res.json({ success: true, data: status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== PRAYER TIMES ====================
app.get('/api/prayer-times', authMiddleware, (req, res) => {
    try {
        const windows = scheduler.getPrayerWindows();
        res.json({ success: true, data: windows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/prayer-times', authMiddleware, (req, res) => {
    try {
        const { prayer, startH, startM, endH, endM } = req.body;
        if (!prayer) return res.status(400).json({ success: false, error: 'Prayer name required' });
        const updated = scheduler.updatePrayerWindow(prayer, startH, startM, endH, endM);
        res.json({ success: true, data: updated, message: `Waktu ${prayer} berhasil diperbarui` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = app;

