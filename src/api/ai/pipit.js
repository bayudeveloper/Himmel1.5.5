const axios = require('axios');
const crypto = require('crypto');

// ==================== TEMP MAIL ====================
class TempMailScraper {
    constructor() {
        this.baseUrl = 'https://akunlama.com';
        this.headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'referer': 'https://akunlama.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

// ==================== PIPIT AI ====================
class PipitAI {
    constructor() {
        this.baseUrl = 'https://www.pipit.ai';
        this.tempMail = new TempMailScraper();
        this.token = '';
        this.cookies = '';
        this.defaultHeaders = {
            'accept': '*/*',
            'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'origin': 'https://www.pipit.ai',
            'referer': 'https://www.pipit.ai/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
    }

    saveCookies(setCookieHeader) {
        if (setCookieHeader && setCookieHeader.length > 0) {
            this.cookies = setCookieHeader.map(c => c.split(';')[0]).join('; ');
        }
    }

    async initialize() {
        const email = await this.tempMail.getEmail();

        // Step 1: Kirim OTP ke email
        await this.sendOtp(email);

        // Step 2: Tunggu kode OTP
        const code = await this.tempMail.waitForCode();
        if (!code) throw new Error('Gagal mendapatkan kode OTP');

        // Step 3: Verifikasi OTP & login
        await this.verifyOtp(email, code);
    }

    async sendOtp(email) {
        const response = await axios.post(`${this.baseUrl}/api/auth/send-otp`, {
            email
        }, {
            headers: {
                ...this.defaultHeaders,
                'content-type': 'application/json'
            },
            timeout: 15000
        });

        this.saveCookies(response.headers['set-cookie']);
        return response.data;
    }

    async verifyOtp(email, otp) {
        const response = await axios.post(`${this.baseUrl}/api/auth/verify-otp`, {
            email,
            otp
        }, {
            headers: {
                ...this.defaultHeaders,
                'content-type': 'application/json',
                'cookie': this.cookies
            },
            timeout: 15000
        });

        this.saveCookies(response.headers['set-cookie']);

        // Simpan token kalau ada di response body
        const data = response.data;
        if (data.token) this.token = data.token;
        if (data.access_token) this.token = data.access_token;

        return data;
    }

    async generateVideo(prompt) {
        const response = await axios.post(`${this.baseUrl}/api/video/generate`, {
            prompt
        }, {
            headers: {
                ...this.defaultHeaders,
                'content-type': 'application/json',
                'cookie': this.cookies,
                ...(this.token ? { 'authorization': `Bearer ${this.token}` } : {})
            },
            timeout: 30000
        });

        this.saveCookies(response.headers['set-cookie']);
        return response.data;
    }

    async getVideoStatus(jobId) {
        const response = await axios.get(`${this.baseUrl}/api/video/status/${jobId}`, {
            headers: {
                ...this.defaultHeaders,
                'cookie': this.cookies,
                ...(this.token ? { 'authorization': `Bearer ${this.token}` } : {})
            },
            timeout: 15000
        });
        return response.data;
    }

    async processVideo(prompt) {
        // Generate video
        const genResult = await this.generateVideo(prompt);

        const jobId = genResult.id || genResult.job_id || genResult.request_id || genResult.taskId;
        if (!jobId) {
            // Kalau langsung return URL video
            if (genResult.url || genResult.video_url) {
                return { url: genResult.url || genResult.video_url };
            }
            throw new Error('Gagal mendapatkan job ID dari response');
        }

        // Polling status sampai selesai, max 3 menit
        const maxAttempts = 90;
        for (let i = 0; i < maxAttempts; i++) {
            const status = await this.getVideoStatus(jobId);

            const isDone = status.status === 'completed' ||
                           status.status === 'done' ||
                           status.status === 'success' ||
                           status.completed === true;

            if (isDone) {
                return {
                    url: status.url || status.video_url || status.output || status.result,
                    status: status.status,
                    data: status
                };
            }

            const isFailed = status.status === 'failed' || status.status === 'error';
            if (isFailed) {
                throw new Error(`Video generation failed: ${status.message || status.error || 'Unknown error'}`);
            }

            await new Promise(r => setTimeout(r, 2000));
        }

        throw new Error('Timeout: video tidak selesai dalam 3 menit');
    }
}

// ==================== ENDPOINT ====================
module.exports = function(app) {
    /**
     * ENDPOINT: GET /ai/pipit?prompt=a cat walking in the rain
     * Desc: Generate video from prompt using pipit.ai (auto login)
     */
    app.get('/ai/pipit', async (req, res) => {
        const { prompt } = req.query;

        if (!prompt) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'prompt' wajib diisi! Contoh: /ai/pipit?prompt=a cat walking in the rain"
            });
        }

        try {
            const pipit = new PipitAI();

            // Auto login via temp mail
            await pipit.initialize();

            // Generate video
            const result = await pipit.processVideo(prompt);

            res.json({
                status: true,
                prompt,
                data: result
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};
