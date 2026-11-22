const axios = require('axios');

const LOGIN_URL = 'https://app.shollu.com/auth/partners-login';
const ABSEN_URL = 'https://api.shollu.com/api/v1/absent-qr';
const ABSEN_TARAWIH_URL = 'https://api.shollu.com/api/v1/absent-qr-tarawih';

/**
 * Login to Shollu and return JWT token.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<string>} JWT Token
 */
async function login(username, password) {
    try {
        const res = await axios.post(
            LOGIN_URL,
            { username, password },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000,
            }
        );

        const data = res.data;
        let token = null;

        if (data.token) {
            token = data.token;
        } else if (data.data && data.data.token) {
            token = data.data.token;
        } else if (data.access_token) {
            token = data.access_token;
        } else if (typeof data === 'string') {
            token = data;
        }

        if (!token) {
            throw new Error(`Login response tidak mengandung token: ${JSON.stringify(data).slice(0, 100)}`);
        }

        return token;
    } catch (err) {
        const msg = err.response
            ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data).slice(0, 100)}`
            : err.message;
        throw new Error(`Login gagal: ${msg}`);
    }
}

/**
 * Send absen request to Shollu API
 * @param {string} token JWT Token
 * @param {string} qrCode
 * @param {number} eventId
 * @param {string} mesinId
 * @param {string} apiKey
 * @returns {Promise<{success: boolean, status: string, data: any, rawResponse: string}>}
 */
async function sendAbsen(token, qrCode, eventId, mesinId, apiKey = 'shollusemakindidepan') {
    try {
        const response = await axios.post(ABSEN_URL, {
            qr_code: qrCode,
            event_id: parseInt(eventId),
            mesin_id: mesinId,
            type: 'sholat_wajib'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-API-Key': apiKey,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            },
            timeout: 30000
        });

        const serverMessage = response.data?.message
            || response.data?.status
            || response.data?.msg
            || 'Berhasil';

        // Custom success check based on user feedback
        const msgLower = serverMessage.toLowerCase();
        const isActuallySuccess = msgLower.includes('qr code found')
            || msgLower.includes('attendance recorded')
            || msgLower.includes('berhasil')
            || msgLower.includes('success');

        return {
            success: isActuallySuccess,
            status: serverMessage,
            data: response.data,
            rawResponse: JSON.stringify(response.data)
        };
    } catch (error) {
        const responseData = error.response?.data;
        const serverMessage = responseData?.message
            || responseData?.status
            || responseData?.msg
            || responseData?.error
            || error.message
            || 'Unknown error';

        // Some "errors" (like already attended) are technically successes for the logic
        const msgLower = serverMessage.toLowerCase();
        const isActuallySuccess = msgLower.includes('sudah absen')
            || msgLower.includes('qr code found')
            || msgLower.includes('attendance recorded');

        return {
            success: isActuallySuccess,
            status: serverMessage,
            data: responseData || null,
            rawResponse: responseData ? JSON.stringify(responseData) : error.message
        };
    }
}

/**
 * Send absen TARAWIH request to Shollu API (different endpoint)
 * @param {string} token JWT Token
 * @param {string} qrCode
 * @param {number} eventId
 * @param {string} mesinId
 * @param {string} apiKey
 * @returns {Promise<{success: boolean, status: string, data: any, rawResponse: string}>}
 */
async function sendAbsenTarawih(token, qrCode, eventId, mesinId, apiKey = 'shollusemakindidepan') {
    try {
        const response = await axios.post(ABSEN_TARAWIH_URL, {
            qr_code: qrCode,
            event_id: parseInt(eventId),
            mesin_id: mesinId,
            type: 'sholat_wajib'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-API-Key': apiKey,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            },
            timeout: 30000
        });

        const serverMessage = response.data?.message
            || response.data?.status
            || response.data?.msg
            || 'Berhasil';

        const msgLower = serverMessage.toLowerCase();
        const isActuallySuccess = msgLower.includes('qr code found')
            || msgLower.includes('attendance recorded')
            || msgLower.includes('berhasil')
            || msgLower.includes('success');

        return {
            success: isActuallySuccess,
            status: serverMessage,
            data: response.data,
            rawResponse: JSON.stringify(response.data)
        };
    } catch (error) {
        const responseData = error.response?.data;
        const serverMessage = responseData?.message
            || responseData?.status
            || responseData?.msg
            || responseData?.error
            || error.message
            || 'Unknown error';

        const msgLower = serverMessage.toLowerCase();
        const isActuallySuccess = msgLower.includes('sudah absen')
            || msgLower.includes('qr code found')
            || msgLower.includes('attendance recorded');

        return {
            success: isActuallySuccess,
            status: serverMessage,
            data: responseData || null,
            rawResponse: responseData ? JSON.stringify(responseData) : error.message
        };
    }
}

/**
 * Test login credentials only (no absen sent)
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{success: boolean, status: string, message: string}>}
 */
async function testLogin(username, password) {
    try {
        const token = await login(username, password);

        if (token) {
            return {
                success: true,
                status: 'login_ok',
                message: '[BERHASIL] Login valid — kredensial terverifikasi'
            };
        }

        return {
            success: false,
            status: 'login_failed',
            message: '[GAGAL] Tidak mendapat token dari server'
        };
    } catch (error) {
        return {
            success: false,
            status: 'login_failed',
            message: `[GAGAL] ${error.message}`
        };
    }
}

module.exports = { login, sendAbsen, sendAbsenTarawih, testLogin, ABSEN_URL, ABSEN_TARAWIH_URL };
