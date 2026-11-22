const https = require('https');
const cron = require('node-cron');
const database = require('./database');
const { login, sendAbsen, sendAbsenTarawih } = require('./api-client');

// Time synchronization
let timeOffset = 0; // ms

// Prayer time windows (WIB / Asia/Jakarta)
const PRAYER_WINDOWS = {
    subuh: { startH: 5, startM: 24, endH: 6, endM: 0, event_id: 3 },
    zuhur: { startH: 12, startM: 31, endH: 13, endM: 30, event_id: 3 },
    ashar: { startH: 15, startM: 40, endH: 16, endM: 20, event_id: 3 },
    maghrib: { startH: 18, startM: 40, endH: 19, endM: 0, event_id: 3 },
    isya: { startH: 19, startM: 45, endH: 20, endM: 0, event_id: 3 },
    tarawih: { startH: 21, startM: 46, endH: 22, endM: 50, event_id: 3, isTarawih: true }
};

// Track scheduled timeouts so we can cancel
let scheduledTimeouts = [];
let isSchedulerActive = true;

/**
 * Get current time in WIB (Asia/Jakarta)
 * Compensated by timeOffset if system clock is inaccurate
 */
function getNowWIB() {
    const compensatedNow = new Date(Date.now() + timeOffset);
    return new Date(compensatedNow.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
}

/**
 * Sync time with a reliable source (Google)
 * Returns the offset in ms
 */
async function syncTime() {
    return new Promise((resolve) => {
        const trySync = (method) => {
            if (method === 'https') {
                try {
                    const req = https.get('https://www.google.com', (res) => {
                        const dateStr = res.headers.date;
                        if (dateStr) {
                            const realTime = new Date(dateStr).getTime();
                            const systemTime = Date.now();
                            timeOffset = realTime - systemTime;
                            console.log(`[Scheduler] 🕒 Time Synchronized (HTTPS). Drift: ${Math.round(timeOffset / 1000)}s`);
                            resolve(timeOffset);
                        } else {
                            trySync('curl');
                        }
                    });
                    req.on('error', () => trySync('curl'));
                    req.setTimeout(3000, () => { req.destroy(); trySync('curl'); });
                } catch (e) { trySync('curl'); }
            } else {
                // Fallback to curl
                const { exec } = require('child_process');
                exec('curl -I https://www.google.com 2>/dev/null | grep -i "^date:"', (err, stdout) => {
                    if (!err && stdout) {
                        const dateStr = stdout.replace(/date:\s*/i, '').trim();
                        const realTime = new Date(dateStr).getTime();
                        const systemTime = Date.now();
                        timeOffset = realTime - systemTime;
                        console.log(`[Scheduler] 🕒 Time Synchronized (CURL). Drift: ${Math.round(timeOffset / 1000)}s`);
                        resolve(timeOffset);
                    } else {
                        console.error('[Scheduler] ⚠️ Time Sync failed globally, using system clock');
                        resolve(0);
                    }
                });
            }
        };

        trySync('https');
    });
}

/**
 * Get a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random time within a prayer window (returns Date in WIB context)
 * Avoids first 2 minutes to not look like a bot
 */
function getRandomTimeInWindow(prayer) {
    const w = PRAYER_WINDOWS[prayer];
    const now = getNowWIB();

    // Create start and end Date objects for today
    const start = new Date(now);
    start.setHours(w.startH, w.startM, 0, 0);

    const end = new Date(now);
    end.setHours(w.endH, w.endM, 0, 0);

    // Add 2 minutes buffer to start (avoid predictable start)
    const bufferedStart = new Date(start.getTime() + 2 * 60 * 1000);
    // End 1 minute before window close
    const bufferedEnd = new Date(end.getTime() - 1 * 60 * 1000);

    if (bufferedStart >= bufferedEnd) {
        // Window too small, just use midpoint
        return new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    }

    const randomMs = bufferedStart.getTime() + Math.random() * (bufferedEnd.getTime() - bufferedStart.getTime());
    return new Date(randomMs);
}

/**
 * Check which prayer window we are currently in
 */
function getCurrentPrayer() {
    const now = getNowWIB();
    const h = now.getHours();
    const m = now.getMinutes();
    const totalMin = h * 60 + m;

    for (const [prayer, w] of Object.entries(PRAYER_WINDOWS)) {
        const startMin = w.startH * 60 + w.startM;
        const endMin = w.endH * 60 + w.endM;
        if (totalMin >= startMin && totalMin <= endMin) {
            return prayer;
        }
    }
    return null;
}

/**
 * Execute absen for a single account + code with natural delay
 */
async function executeAbsen(token, account, code, prayer) {
    const w = PRAYER_WINDOWS[prayer] || { event_id: 3 };

    // Natural delay 10-20 seconds
    const delay = randomInt(10, 20) * 1000;
    console.log(`[Scheduler] ⏳ Memproses antrian untuk ${account.username} (${prayer})...`);

    await new Promise(resolve => setTimeout(resolve, delay));

    console.log(`[Scheduler] 📤 Mengirim Absensi: ${account.username} | Sholat: ${prayer} | Code: ${code.code}`);

    const result = w.isTarawih
        ? await sendAbsenTarawih(token, code.code, w.event_id, account.mesin_id, account.api_key)
        : await sendAbsen(token, code.code, w.event_id, account.mesin_id, account.api_key);

    // Format log sesuai gaya partner.shollu.com
    const logPrefix = result.success ? '[BERHASIL]' : '[GAGAL]';
    const statusMsg = `${logPrefix} ${result.status}`;
    console.log(`[Scheduler] ${statusMsg}`);

    // Log to database
    await database.addLog(
        account.id,
        prayer,
        code.code,
        result.success ? 'success' : 'failed',
        statusMsg // Simpan pesan status yang sudah ada prefix [BERHASIL]/[GAGAL]
    );

    // Mark executed
    if (result.success) {
        await database.markExecuted(account.id, code.code, prayer);
    }

    return result;
}

/**
 * Process all accounts for a given prayer
 */
async function processAllAccounts(prayer) {
    if (!isSchedulerActive) {
        console.log(`[Scheduler] ⛔ Scheduler inactive, skipping ${prayer}`);
        return;
    }

    const accounts = await database.getAllAccounts();
    const activeAccounts = accounts.filter(a => a.is_active);

    if (activeAccounts.length === 0) {
        console.log(`[Scheduler] No active accounts for ${prayer}`);
        return;
    }

    console.log(`[Scheduler] 🕌 Processing ${prayer.toUpperCase()} for ${activeAccounts.length} active account(s)`);

    for (let i = 0; i < activeAccounts.length; i++) {
        const account = activeAccounts[i];

        // Check if this account has this prayer enabled
        const schedules = await database.getSchedulesForAccount(account.id);
        const schedule = schedules.find(s => s.prayer === prayer);
        if (!schedule || !schedule.is_active) {
            console.log(`[Scheduler] ⏭️ ${account.username} skipped (${prayer} disabled)`);
            continue;
        }

        // Get active codes for this account
        const codes = (await database.getCodesForAccount(account.id)).filter(c => c.is_active);
        if (codes.length === 0) {
            console.log(`[Scheduler] ⏭️ ${account.username} skipped (no active codes)`);
            continue;
        }

        // 1. Login once per account
        let token = null;
        try {
            token = await login(account.username, account.password);
            console.log(`[Scheduler] 🔐 Login successful for ${account.username}`);
            // Log successful login
            await database.addLog(account.id, 'login', 'SYSTEM', 'success', 'Login berhasil (Bot)');
        } catch (err) {
            console.error(`[Scheduler] ❌ Login failed for ${account.username}: ${err.message}`);
            await database.addLog(account.id, prayer, 'ALL', 'error', `Login gagal: ${err.message}`);
            continue;
        }

        for (const code of codes) {
            // Check if already executed today
            if (await database.hasExecutedToday(account.id, code.code, prayer)) {
                console.log(`[Scheduler] ⏭️ ${account.username} code ${code.code} already done for ${prayer} today`);
                continue;
            }

            await executeAbsen(token, account, code, prayer);

            // Delay between codes for same account: 5-10 seconds
            if (codes.indexOf(code) < codes.length - 1) {
                const codeDelay = randomInt(5, 10) * 1000;
                await new Promise(resolve => setTimeout(resolve, codeDelay));
            }
        }

        // Staggered queue: 1-2 minute delay between accounts
        if (i < activeAccounts.length - 1) {
            const staggerDelay = randomInt(60, 120) * 1000;
            console.log(`[Scheduler] 🕐 Stagger delay: ${Math.round(staggerDelay / 1000)}s before next account...`);
            await new Promise(resolve => setTimeout(resolve, staggerDelay));
        }
    }

    console.log(`[Scheduler] ✅ Finished processing ${prayer.toUpperCase()}`);
}

/**
 * Schedule a prayer execution at a random time within its window
 */
function schedulePrayer(prayer) {
    const randomTime = getRandomTimeInWindow(prayer);
    const now = getNowWIB();
    const delayMs = randomTime.getTime() - now.getTime();

    if (delayMs <= 0) return; // Window passed

    console.log(`[Scheduler] 📅 ${prayer.toUpperCase()} scheduled at ${randomTime.toLocaleTimeString('id-ID')} (in ${Math.round(delayMs / 1000)}s)`);

    const timeout = setTimeout(async () => {
        await processAllAccounts(prayer);
    }, delayMs);

    scheduledTimeouts.push({ prayer, timeout, scheduledTime: randomTime });
}

/**
 * Main scheduler: runs every minute to check if we should schedule prayers
 * Only schedules once per prayer window per day
 */
let scheduledToday = {};

async function startScheduler() {
    // 1. Sync time first
    await syncTime();

    console.log('[Scheduler] 🚀 Scheduler started');
    console.log(`[Scheduler] ⏱️ Current compensated WIB: ${getNowWIB().toLocaleTimeString('id-ID')}`);

    // Clear old executions daily
    database.clearOldExecutions();

    // Check every minute
    cron.schedule('0 * * * * *', async () => {
        if (!isSchedulerActive) return;

        const now = getNowWIB();
        const today = now.toLocaleDateString('en-CA');
        const h = now.getHours();
        const m = now.getMinutes();
        const totalMin = h * 60 + m;

        // Reset daily tracking at midnight
        if (h === 0 && m === 0) {
            scheduledToday = {};
            await database.clearOldExecutions();
            console.log('[Scheduler] 🔄 Daily reset complete');
        }

        // Check each prayer window
        for (const [prayer, w] of Object.entries(PRAYER_WINDOWS)) {
            const startMin = w.startH * 60 + w.startM;
            const endMin = w.endH * 60 + w.endM; // Added this line as it was missing in the original code snippet
            const key = `${today}_${prayer}`;

            // Schedule 1 minute before window opens
            if (totalMin === startMin - 1 && !scheduledToday[key]) {
                scheduledToday[key] = true;
                schedulePrayer(prayer);
            }

            // Also schedule if server just started and we're already in the window
            if (totalMin >= startMin && totalMin <= endMin && !scheduledToday[key]) {
                scheduledToday[key] = true;
                schedulePrayer(prayer);
            }
        }
    }, {
        timezone: 'Asia/Jakarta'
    });
}

function stopScheduler() {
    isSchedulerActive = false;
    scheduledTimeouts.forEach(t => clearTimeout(t.timeout));
    scheduledTimeouts = [];
    console.log('[Scheduler] ⛔ Scheduler stopped');
}

function resumeScheduler() {
    isSchedulerActive = true;
    console.log('[Scheduler] ▶️ Scheduler resumed');
}

function getSchedulerStatus() {
    const now = getNowWIB();
    const currentPrayer = getCurrentPrayer();

    const nextPrayers = [];
    const h = now.getHours();
    const m = now.getMinutes();
    const totalMin = h * 60 + m;

    for (const [prayer, w] of Object.entries(PRAYER_WINDOWS)) {
        const startMin = w.startH * 60 + w.startM;
        const endMin = w.endH * 60 + w.endM;

        let status = 'waiting';
        if (totalMin >= startMin && totalMin <= endMin) {
            status = 'active';
        } else if (totalMin > endMin) {
            status = 'done';
        }

        nextPrayers.push({
            prayer,
            window: `${String(w.startH).padStart(2, '0')}:${String(w.startM).padStart(2, '0')} - ${String(w.endH).padStart(2, '0')}:${String(w.endM).padStart(2, '0')}`,
            status
        });
    }

    return {
        active: isSchedulerActive,
        currentTime: now.toLocaleTimeString('id-ID', { hour12: false }),
        currentDate: now.toLocaleDateString('id-ID'),
        currentPrayer,
        prayers: nextPrayers,
        scheduledExecutions: scheduledTimeouts.map(t => ({
            prayer: t.prayer,
            scheduledAt: t.scheduledTime.toLocaleTimeString('id-ID')
        }))
    };
}

/**
 * Manual absen for a specific account (bypasses schedule)
 */
async function manualAbsen(accountId, prayer) {
    const account = await database.getAccount(accountId);
    if (!account) throw new Error('Akun tidak ditemukan');

    const codes = (await database.getCodesForAccount(accountId)).filter(c => c.is_active);
    if (codes.length === 0) throw new Error('Tidak ada kode absen aktif');

    const results = [];

    // Step 1: Login
    let token = null;
    try {
        token = await login(account.username, account.password);
        await database.addLog(accountId, 'login-manual', 'SYSTEM', 'success', `[BERHASIL] Login manual untuk ${account.username}`);
    } catch (err) {
        throw new Error('Login gagal: ' + err.message);
    }

    // Step 2: Send absen for each code
    const w = PRAYER_WINDOWS[prayer] || { event_id: 3 };
    const totalCodes = codes.length;

    for (let i = 0; i < totalCodes; i++) {
        const code = codes[i];

        try {
            // Small delay between requests to be safe
            const delay = randomInt(2, 5) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));

            const result = w.isTarawih
                ? await sendAbsenTarawih(token, code.code, w.event_id, account.mesin_id, account.api_key)
                : await sendAbsen(token, code.code, w.event_id, account.mesin_id, account.api_key);

            const logPrefix = result.success ? '[BERHASIL]' : '[GAGAL]';
            const statusMsg = `${logPrefix} ${result.status}`;

            await database.addLog(accountId, prayer || 'manual', code.code, result.success ? 'success' : 'failed', statusMsg);

            if (result.success) {
                await database.markExecuted(accountId, code.code, prayer || 'manual');
            }

            results.push({
                code: code.code,
                label: code.label,
                ...result,
                status: statusMsg,
                index: i + 1,
                total: totalCodes
            });
        } catch (err) {
            // Handle error per code, don't stop entire batch
            const errorMsg = `[GAGAL] Error: ${err.message}`;
            await database.addLog(accountId, prayer || 'manual', code.code, 'failed', errorMsg);

            results.push({
                code: code.code,
                label: code.label,
                success: false,
                status: errorMsg,
                data: null,
                rawResponse: err.message,
                index: i + 1,
                total: totalCodes
            });
        }
    }

    return results;
}

/**
 * Get current prayer windows configuration
 */
function getPrayerWindows() {
    return JSON.parse(JSON.stringify(PRAYER_WINDOWS));
}

/**
 * Update a prayer time window
 */
function updatePrayerWindow(prayer, startH, startM, endH, endM) {
    if (!PRAYER_WINDOWS[prayer]) throw new Error(`Sholat '${prayer}' tidak ditemukan`);

    // Clear any existing timeout for this prayer
    const existingIdx = scheduledTimeouts.findIndex(t => t.prayer === prayer);
    if (existingIdx !== -1) {
        clearTimeout(scheduledTimeouts[existingIdx].timeout);
        console.log(`[Scheduler] 🔄 Cancelled existing schedule for ${prayer.toUpperCase()} due to window update`);
        scheduledTimeouts.splice(existingIdx, 1);
    }

    PRAYER_WINDOWS[prayer].startH = parseInt(startH);
    PRAYER_WINDOWS[prayer].startM = parseInt(startM);
    PRAYER_WINDOWS[prayer].endH = parseInt(endH);
    PRAYER_WINDOWS[prayer].endM = parseInt(endM);

    // Reset scheduled today so new times take effect (allows startScheduler loop to pick it up)
    const today = getNowWIB().toLocaleDateString('en-CA');
    delete scheduledToday[`${today}_${prayer}`];

    console.log(`[Scheduler] ⚙️ Updated ${prayer.toUpperCase()} window: ${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);

    return PRAYER_WINDOWS[prayer];
}

module.exports = {
    startScheduler,
    stopScheduler,
    resumeScheduler,
    getSchedulerStatus,
    processAllAccounts,
    manualAbsen,
    getCurrentPrayer,
    getPrayerWindows,
    updatePrayerWindow,
    PRAYER_WINDOWS
};
