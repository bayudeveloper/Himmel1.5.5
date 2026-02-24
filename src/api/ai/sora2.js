const axios = require('axios');
const crypto = require('crypto');

const delay = ms => new Promise(r => setTimeout(r, ms));

// ==================== TEMP MAIL (sama persis kayak nanana.js) ====================
class TempMailScraper {
    constructor() {
        this.baseUrl = 'https://akunlama.com';
        this.headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'referer': 'https://akunlama.com/',
            'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
        };
        this.recipient = crypto.randomBytes(8).toString('hex').substring(0, 10);
        this.lastCount = 0;
    }

    async getEmail() {
        return `${this.recipient}@akunlama.com`;
    }

    async checkInbox() {
        const response = await axios.get(`${this.baseUrl}/api/list`, {
            params: { recipient: this.recipient },
            headers: { ...this.headers, referer: `https://akunlama.com/inbox/${this.recipient}/list` },
            timeout: 10000
        });
        return response.data;
    }

    async getMessageContent(msg) {
        const response = await axios.get(`${this.baseUrl}/api/getHtml`, {
            params: { region: msg.storage.region, key: msg.storage.key },
            headers: { ...this.headers, referer: `https://akunlama.com/inbox/${this.recipient}/message/${msg.storage.region}/${msg.storage.key}` },
            timeout: 10000
        });
        return response.data;
    }

    extractCode(html) {
        // Format: "9 1 4 8 7 3" (dipisah spasi)
        const spaced = html.match(/(\d\s){5}\d/);
        if (spaced) return spaced[0].replace(/\s/g, '');
        // Fallback: 6 digit berturutan
        const match = html.match(/(\d{6})/);
        return match ? match[1] : null;
    }

    async waitForCode() {
        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                try {
                    const inbox = await this.checkInbox();
                    if (inbox.length > this.lastCount) {
                        for (const msg of inbox.slice(this.lastCount)) {
                            const html = await this.getMessageContent(msg);
                            const code = this.extractCode(html);
                            if (code) {
                                clearInterval(interval);
                                resolve(code);
                            }
                        }
                        this.lastCount = inbox.length;
                    }
                } catch (err) {}
            }, 5000);

            setTimeout(() => {
                clearInterval(interval);
                resolve(null);
            }, 120000);
        });
    }
}

// ==================== SORA2 ====================
const soraHeaders = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
    'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'Accept-Language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6',
    'origin': 'https://www.nanobana.net',
    'referer': 'https://www.nanobana.net/m/sora2'
};

function extract(cookieStore, res) {
    const setC = res.headers['set-cookie'];
    if (setC) {
        setC.forEach(c => {
            const parts = c.split(';')[0].split('=');
            if (parts.length > 1) cookieStore[parts[0]] = parts.slice(1).join('=');
        });
    }
}

function getkukis(cookieStore) {
    return Object.entries(cookieStore).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function sendcode(cookieStore, email) {
    // Ambil halaman dulu biar dapat cookie awal
    const page = await axios.get('https://www.nanobana.net/m/sora2', {
        headers: soraHeaders,
        timeout: 15000
    });
    extract(cookieStore, page);

    // Kirim OTP dengan cookie
    const res = await axios.post('https://www.nanobana.net/api/auth/email/send', { email }, {
        headers: {
            ...soraHeaders,
            'Content-Type': 'application/json',
            Cookie: getkukis(cookieStore)
        },
        timeout: 15000
    });
    extract(cookieStore, res);
    return res.data;
}

async function getCsrf(cookieStore) {
    const res = await axios.get('https://www.nanobana.net/api/auth/csrf', {
        headers: { ...soraHeaders, Cookie: getkukis(cookieStore) },
        timeout: 10000
    });
    extract(cookieStore, res);
    return res.data.csrfToken;
}

async function login(cookieStore, email, code, csrfToken) {
    const data = `email=${encodeURIComponent(email)}&code=${code}&redirect=false&csrfToken=${csrfToken}&callbackUrl=${encodeURIComponent('https://www.nanobana.net/m/sora2')}`;
    const res = await axios.post('https://www.nanobana.net/api/auth/callback/email-code', data, {
        headers: { ...soraHeaders, 'Content-Type': 'application/x-www-form-urlencoded', 'x-auth-return-redirect': '1', Cookie: getkukis(cookieStore) },
        timeout: 15000
    });
    extract(cookieStore, res);
    return res.data;
}

async function getsesi(cookieStore) {
    const res = await axios.get('https://www.nanobana.net/api/auth/session', {
        headers: { ...soraHeaders, Cookie: getkukis(cookieStore) },
        timeout: 10000
    });
    extract(cookieStore, res);
    return res.data;
}

async function getuserinfo(cookieStore) {
    const res = await axios.post('https://www.nanobana.net/api/get-user-info', '', {
        headers: { ...soraHeaders, Cookie: getkukis(cookieStore) },
        timeout: 10000
    });
    extract(cookieStore, res);
    return res.data;
}

async function submitsora(cookieStore, prompt, aspectratio, nFrames) {
    const res = await axios.post('https://www.nanobana.net/api/sora2/text-to-video/generate',
        { prompt, aspect_ratio: aspectratio, n_frames: nFrames, remove_watermark: true },
        { headers: { ...soraHeaders, 'Content-Type': 'application/json', Cookie: getkukis(cookieStore) }, timeout: 30000 }
    );
    extract(cookieStore, res);
    return res.data.taskId;
}

async function cekstatus(cookieStore, taskId, promptText) {
    const res = await axios.get(`https://www.nanobana.net/api/sora2/text-to-video/task/${taskId}?save=1&prompt=${encodeURIComponent(promptText)}`, {
        headers: { ...soraHeaders, Cookie: getkukis(cookieStore) },
        timeout: 15000
    });
    extract(cookieStore, res);
    return res.data;
}

async function sora2(prompt, aspect_ratio = 'landscape', n_frames = '10') {
    const cookieStore = {};
    const tempMail = new TempMailScraper();
    const email = await tempMail.getEmail();

    await sendcode(cookieStore, email);
    const code = await tempMail.waitForCode();
    if (!code) throw new Error('OTP timeout — email tidak menerima kode dari nanobana.net');

    const csrfToken = await getCsrf(cookieStore);
    await login(cookieStore, email, code, csrfToken);
    await getsesi(cookieStore);
    await getuserinfo(cookieStore);

    const taskId = await submitsora(cookieStore, prompt, aspect_ratio, n_frames);
    if (!taskId) throw new Error('Gagal mendapatkan Task ID');

    let result;
    const pendingStatus = ['processing', 'waiting'];
    do {
        await delay(5000);
        result = await cekstatus(cookieStore, taskId, prompt);
    } while (pendingStatus.includes(result.status));

    if (result.status === 'failed' || result.status === 'error') {
        throw new Error(`Generate gagal: ${result.error_message || 'Server error / Filtered'}`);
    }

    let videoUrl = null;
    if (result.resultUrls?.length > 0) videoUrl = result.resultUrls[0];
    else if (result.saved?.length > 0) videoUrl = result.saved[0].url;

    return { task_id: taskId, video: videoUrl };
}

// ==================== ENDPOINT ====================
module.exports = function(app) {
    /**
     * ENDPOINT: GET /ai/sora?prompt=a cat walking&ratio=landscape&frames=10
     */
    app.get('/ai/sora', async (req, res) => {
        const { prompt, ratio = 'landscape', frames = '10' } = req.query;

        if (!prompt) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'prompt' wajib diisi! Contoh: /ai/sora?prompt=a cat walking"
            });
        }

        try {
            const result = await sora2(prompt, ratio, frames);
            res.json({
                status: true,
                prompt,
                ratio,
                frames,
                task_id: result.task_id,
                video: result.video
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};
