const axios = require('axios');
const crypto = require('crypto');

const delay = ms => new Promise(r => setTimeout(r, ms));

// ==================== TEMP MAIL ====================
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
        // Format nanobana: "9 1 4 8 7 3" (dipisah spasi)
        const spaced = html.match(/(\d\s){5}\d/);
        if (spaced) return spaced[0].replace(/\s/g, '');
        // Fallback 6 digit berturutan
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

// ==================== NANOBANA ====================
const nanoHeaders = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
    'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'Accept-Language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6',
    'origin': 'https://nanobana.net',
    'referer': 'https://nanobana.net/'
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

async function login(cookieStore, email) {
    // Ambil halaman dulu biar dapat cookie awal
    const page = await axios.get('https://nanobana.net/', {
        headers: nanoHeaders,
        timeout: 15000
    });
    extract(cookieStore, page);

    // Kirim OTP
    const send = await axios.post('https://nanobana.net/api/auth/email/send', { email }, {
        headers: { ...nanoHeaders, 'Content-Type': 'application/json', Cookie: getkukis(cookieStore) },
        timeout: 15000
    });
    extract(cookieStore, send);

    return send.data;
}

async function verifyOtp(cookieStore, email, code) {
    // Ambil CSRF token
    const csrf = await axios.get('https://nanobana.net/api/auth/csrf', {
        headers: { ...nanoHeaders, Cookie: getkukis(cookieStore) },
        timeout: 10000
    });
    extract(cookieStore, csrf);
    const csrfToken = csrf.data.csrfToken;

    // Login dengan OTP
    const data = `email=${encodeURIComponent(email)}&code=${code}&redirect=false&csrfToken=${csrfToken}&callbackUrl=${encodeURIComponent('https://nanobana.net/')}`;
    const res = await axios.post('https://nanobana.net/api/auth/callback/email-code', data, {
        headers: {
            ...nanoHeaders,
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-auth-return-redirect': '1',
            Cookie: getkukis(cookieStore)
        },
        timeout: 15000
    });
    extract(cookieStore, res);

    // Get session
    const sesi = await axios.get('https://nanobana.net/api/auth/session', {
        headers: { ...nanoHeaders, Cookie: getkukis(cookieStore) },
        timeout: 10000
    });
    extract(cookieStore, sesi);

    return sesi.data;
}

async function generateImage(cookieStore, prompt, model = 'nano-banana') {
    // Coba beberapa kemungkinan endpoint
    const endpoints = [
        { url: 'https://nanobana.net/api/generate', body: { prompt, model, type: 'text-to-image', resolution: '1K', output_number: 1 } },
        { url: 'https://nanobana.net/api/nano-banana/generate', body: { prompt, model, type: 'text-to-image' } },
        { url: 'https://nanobana.net/api/image/generate', body: { prompt, model } },
        { url: 'https://nanobana.net/api/txt2img', body: { prompt } }
    ];

    for (const ep of endpoints) {
        try {
            const res = await axios.post(ep.url, ep.body, {
                headers: { ...nanoHeaders, 'Content-Type': 'application/json', Cookie: getkukis(cookieStore) },
                timeout: 30000
            });
            extract(cookieStore, res);
            if (res.data && (res.data.taskId || res.data.task_id || res.data.id)) {
                return { taskId: res.data.taskId || res.data.task_id || res.data.id, endpoint: ep.url };
            }
        } catch (e) {}
    }

    throw new Error('Semua endpoint generate gagal — perlu info endpoint yang benar');
}

async function checkStatus(cookieStore, taskId, prompt) {
    const endpoints = [
        `https://nanobana.net/api/task/${taskId}`,
        `https://nanobana.net/api/generate/status/${taskId}`,
        `https://nanobana.net/api/result/${taskId}`
    ];

    for (const url of endpoints) {
        try {
            const res = await axios.get(url, {
                headers: { ...nanoHeaders, Cookie: getkukis(cookieStore) },
                timeout: 15000
            });
            extract(cookieStore, res);
            if (res.data) return res.data;
        } catch (e) {}
    }

    throw new Error('Gagal cek status task');
}

async function txt2img(prompt, model = 'nano-banana') {
    const cookieStore = {};
    const tempMail = new TempMailScraper();
    const email = await tempMail.getEmail();

    await login(cookieStore, email);
    const code = await tempMail.waitForCode();
    if (!code) throw new Error('OTP timeout');

    await verifyOtp(cookieStore, email, code);

    const { taskId } = await generateImage(cookieStore, prompt, model);
    if (!taskId) throw new Error('Gagal mendapatkan Task ID');

    let result;
    const pendingStatus = ['processing', 'waiting', 'pending'];
    let attempts = 0;

    do {
        await delay(5000);
        result = await checkStatus(cookieStore, taskId, prompt);
        attempts++;
        if (attempts > 60) throw new Error('Timeout: gambar tidak selesai dalam 5 menit');
    } while (pendingStatus.includes(result.status));

    if (result.status === 'failed' || result.status === 'error') {
        throw new Error(`Generate gagal: ${result.error_message || 'Unknown error'}`);
    }

    let imageUrl = null;
    if (result.resultUrls?.length > 0) imageUrl = result.resultUrls[0];
    else if (result.saved?.length > 0) imageUrl = result.saved[0].url;
    else if (result.url) imageUrl = result.url;
    else if (result.image) imageUrl = result.image;

    return { task_id: taskId, image: imageUrl };
}

// ==================== ENDPOINT ====================
module.exports = function(app) {
    /**
     * ENDPOINT: GET /ai/txt2img?prompt=beautiful lake&model=nano-banana
     * Desc: Generate gambar dari teks menggunakan Nanobana (auto login)
     *
     * Query Params:
     *   - prompt : deskripsi gambar (wajib)
     *   - model  : model yang dipakai (opsional, default: nano-banana)
     */
    app.get('/ai/txt2img', async (req, res) => {
        const { prompt, model = 'nano-banana' } = req.query;

        if (!prompt) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'prompt' wajib diisi! Contoh: /ai/txt2img?prompt=beautiful lake"
            });
        }

        try {
            const result = await txt2img(prompt, model);
            res.json({
                status: true,
                prompt,
                model,
                task_id: result.task_id,
                image: result.image
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};
