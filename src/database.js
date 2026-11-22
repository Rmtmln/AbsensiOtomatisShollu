require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'rahmets',
  password: process.env.DB_PASSWORD || 'akaza',
  database: process.env.DB_NAME || 'shollu_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'shollu-bot-secret-key-2024').digest();
const IV_LENGTH = 16;

const pool = mysql.createPool(DB_CONFIG);

// ==================== ENCRYPTION ====================
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return text;
  }
}

// ==================== DASHBOARD USERS ====================
async function getUserByUsername(username) {
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0];
}

async function createUser(username, hashedPassword) {
  const [result] = await pool.query(
    'INSERT INTO users (username, password, is_approved) VALUES (?, ?, 0)',
    [username, hashedPassword]
  );
  return result.insertId;
}

// ==================== ACCOUNTS ====================
async function getAllAccounts() {
  const [accounts] = await pool.query('SELECT * FROM accounts ORDER BY id');
  return accounts.map(acc => ({
    ...acc,
    password: decrypt(acc.password)
  }));
}

async function getAccount(id) {
  const [rows] = await pool.query('SELECT * FROM accounts WHERE id = ?', [id]);
  const acc = rows[0];
  if (acc) acc.password = decrypt(acc.password);
  return acc;
}

async function createAccount(username, password, mesinId = '1101932', apiKey = 'shollusemakindidepan') {
  const encrypted = encrypt(password);
  const [result] = await pool.query(
    'INSERT INTO accounts (username, password, mesin_id, api_key) VALUES (?, ?, ?, ?)',
    [username, encrypted, mesinId, apiKey]
  );

  const accountId = result.insertId;

  // Create default schedules (all active)
  const prayers = ['subuh', 'zuhur', 'ashar', 'maghrib', 'isya', 'tarawih'];
  for (const prayer of prayers) {
    await pool.query(
      'INSERT INTO schedules (account_id, prayer, is_active) VALUES (?, ?, 1)',
      [accountId, prayer]
    );
  }

  return accountId;
}

async function updateAccount(id, username, password, mesinId, apiKey) {
  const encrypted = encrypt(password);
  await pool.query(
    'UPDATE accounts SET username = ?, password = ?, mesin_id = ?, api_key = ? WHERE id = ?',
    [username, encrypted, mesinId, apiKey, id]
  );
}

async function deleteAccount(id) {
  await pool.query('DELETE FROM accounts WHERE id = ?', [id]);
}

async function toggleAccount(id, isActive) {
  await pool.query('UPDATE accounts SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
}

async function toggleAllAccounts(isActive) {
  await pool.query('UPDATE accounts SET is_active = ?', [isActive ? 1 : 0]);
}

// ==================== ABSEN CODES ====================
async function getCodesForAccount(accountId) {
  const [rows] = await pool.query('SELECT * FROM absen_codes WHERE account_id = ? ORDER BY id', [accountId]);
  return rows;
}

async function addCode(accountId, code, label = '') {
  const [result] = await pool.query(
    'INSERT INTO absen_codes (account_id, code, label) VALUES (?, ?, ?)',
    [accountId, code, label]
  );
  return result.insertId;
}

async function deleteCode(id) {
  await pool.query('DELETE FROM absen_codes WHERE id = ?', [id]);
}

async function toggleCode(id, isActive) {
  await pool.query('UPDATE absen_codes SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
}

// ==================== SCHEDULES ====================
async function getSchedulesForAccount(accountId) {
  const [rows] = await pool.query('SELECT * FROM schedules WHERE account_id = ? ORDER BY id', [accountId]);
  return rows;
}

async function updateSchedule(accountId, prayer, isActive) {
  await pool.query(
    'UPDATE schedules SET is_active = ? WHERE account_id = ? AND prayer = ?',
    [isActive ? 1 : 0, accountId, prayer]
  );
}

// ==================== LOGS ====================
async function addLog(accountId, prayer, code, status, response) {
  await pool.query(
    'INSERT INTO logs (account_id, prayer, code, status, response) VALUES (?, ?, ?, ?, ?)',
    [accountId, prayer, code, status, response]
  );
}

async function getLogs(limit = 100, offset = 0) {
  const [rows] = await pool.query(`
    SELECT logs.*, accounts.username
    FROM logs
    JOIN accounts ON logs.account_id = accounts.id
    ORDER BY logs.id DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
  return rows;
}

async function getLogsForAccount(accountId, limit = 50) {
  const [rows] = await pool.query(`
    SELECT * FROM logs WHERE account_id = ? ORDER BY id DESC LIMIT ?
  `, [accountId, limit]);
  return rows;
}

async function getLogCount() {
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM logs');
  return rows[0].count;
}

async function deleteLog(id) {
  await pool.query('DELETE FROM logs WHERE id = ?', [id]);
}

async function clearAllLogs() {
  await pool.query('DELETE FROM logs');
}

// ==================== EXECUTION TRACKER ====================
async function hasExecutedToday(accountId, code, prayer) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const [rows] = await pool.query(
    'SELECT id FROM execution_tracker WHERE account_id = ? AND code = ? AND prayer = ? AND date = ?',
    [accountId, code, prayer, today]
  );
  return rows.length > 0;
}

async function markExecuted(accountId, code, prayer) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  try {
    await pool.query(
      'INSERT INTO execution_tracker (account_id, code, prayer, date) VALUES (?, ?, ?, ?)',
      [accountId, code, prayer, today]
    );
  } catch (err) {
    // Already exists or other error
  }
}

async function clearOldExecutions() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  await pool.query('DELETE FROM execution_tracker WHERE date < ?', [today]);
}

module.exports = {
  pool,
  encrypt, decrypt,
  getAllAccounts, getAccount, createAccount, updateAccount, deleteAccount,
  toggleAccount, toggleAllAccounts,
  getCodesForAccount, addCode, deleteCode, toggleCode,
  getSchedulesForAccount, updateSchedule,
  addLog, getLogs, getLogsForAccount, getLogCount, deleteLog, clearAllLogs,
  hasExecutedToday, markExecuted, clearOldExecutions,
  getUserByUsername, createUser
};
