const axios = require('axios');
const crypto = require('crypto');

const delay = ms => new Promise(r => setTimeout(r, ms));

module.exports = function(app) {

    const headers = {
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
                if (parts.length > 1) {
                    cookieStore[parts[0]] = parts.slice(1).join('=');
                }
            });
        }
    }

    function getkukis(cookieStore) {
        return Object.entries(cookieStore).map(([k, v]) => `${k}=${v}`).join('; ');
    }

    async function cekmail(name) {
        // Cek apakah email tersedia
        try {
            const res = await axios.get(`https://akunlama.com/api/list`, {
                params: { recipient: name },
                timeout: 10000
            });
            if (Array.isArray(res.data) && res.data.length === 0) {
                return `${name}@akunlama.com`;
            }
            throw new Error('Email taken');
        } catch (err) {
            if (err.message === 'Email taken') throw err;
            return `${name}@akunlama.com`;
        }
    }

    async function getotp(name) {
        let code = null;
        for (let i = 0; i < 24; i++) {
            await delay(5000);
            try {
                const res = await axios.get(`https://akunlama.com/api/list`, {
                    params: { recipient: name },
                    timeout: 10000
                });
                const mails = res.data;
                if (Array.isArray(mails) && mails.length > 0) {
                    for (const m of mails) {
                        // Cek di subject
                        const subject = m.message?.headers?.subject || m.subject || '';
                        let match = subject.match(/Code:\s*(\d{6})/i) || subject.match(/(\d{6})/);
                        if (match) { code = match[1]; break; }

                        // Cek di body/html
                        const body = m.message?.html || m.message?.text || m.body || m.html || '';
                        if (body) {
                            const bodyMatch = body.match(/(\d{6})/);
                            if (bodyMatch) { code = bodyMatch[1]; break; }
                        }
                    }
                }
            } catch (e) {}
            if (code) break;
        }
        return code;
    }

    async function sendcode(cookieStore, email) {
        const res = await axios.post('https://www.nanobana.net/api/auth/email/send', { email }, {
            headers: { ...headers, 'Content-Type': 'application/json' },
            timeout: 15000
        });
        extract(cookieStore, res);
        return res.data;
    }

    async function getCsrf(cookieStore) {
        const res = await axios.get('https://www.nanobana.net/api/auth/csrf', {
            headers: { ...headers, Cookie: getkukis(cookieStore) },
            timeout: 10000
        });
        extract(cookieStore, res);
        return res.data.csrfToken;
    }

    async function login(cookieStore, email, code, csrfToken) {
        const data = `email=${encodeURIComponent(email)}&code=${code}&redirect=false&csrfToken=${csrfToken}&callbackUrl=${encodeURIComponent('https://www.nanobana.net/m/sora2')}`;
        const res = await axios.post('https://www.nanobana.net/api/auth/callback/email-code', data, {
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-auth-return-redirect': '1',
                Cookie: getkukis(cookieStore)
            },
            timeout: 15000
        });
        extract(cookieStore, res);
        return res.data;
    }

    async function getsesi(cookieStore) {
        const res = await axios.get('https://www.nanobana.net/api/auth/session', {
            headers: { ...headers, Cookie: getkukis(cookieStore) },
            timeout: 10000
        });
        extract(cookieStore, res);
        return res.data;
    }

    async function getuserinfo(cookieStore) {
        const res = await axios.post('https://www.nanobana.net/api/get-user-info', '', {
            headers: { ...headers, Cookie: getkukis(cookieStore) },
            timeout: 10000
        });
        extract(cookieStore, res);
        return res.data;
    }

    async function submitsora(cookieStore, prompt, aspectratio, nFrames) {
        const payload = { prompt, aspect_ratio: aspectratio, n_frames: nFrames, remove_watermark: true };
        const res = await axios.post('https://www.nanobana.net/api/sora2/text-to-video/generate', payload, {
            headers: { ...headers, 'Content-Type': 'application/json', Cookie: getkukis(cookieStore) },
            timeout: 30000
        });
        extract(cookieStore, res);
        return res.data.taskId;
    }

    async function cekstatus(cookieStore, taskId, promptText) {
        const url = `https://www.nanobana.net/api/sora2/text-to-video/task/${taskId}?save=1&prompt=${encodeURIComponent(promptText)}`;
        const res = await axios.get(url, {
            headers: { ...headers, Cookie: getkukis(cookieStore) },
            timeout: 15000
        });
        extract(cookieStore, res);
        return res.data;
    }

    async function sora2(prompt, aspect_ratio = 'landscape', n_frames = '10') {
        const cookieStore = {};
        const randomName = crypto.randomBytes(6).toString('hex');
        const email = await cekmail(randomName);

        await sendcode(cookieStore, email);
        const code = await getotp(randomName);
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
        if (result.resultUrls?.length > 0) {
            videoUrl = result.resultUrls[0];
        } else if (result.saved?.length > 0) {
            videoUrl = result.saved[0].url;
        }

        return { task_id: taskId, video: videoUrl };
    }

    /**
     * ENDPOINT: GET /ai/sora?prompt=a cat&ratio=landscape&frames=10
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
