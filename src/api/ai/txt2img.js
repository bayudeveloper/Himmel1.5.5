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
        const spaced = html.match(/(\d\s){5}\d/);
        if (spaced) return spaced[0].replace(/\s/g, '');
        const match = html.match(/\b(\d{6})\b/);
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
            setTimeout(() => { clearInterval(interval); resolve(null); }, 120000);
        });
    }
}

// ==================== IDEOGRAM ====================
async function generateIdeogram(prompt) {
    const tempMail = new TempMailScraper();
    const email = await tempMail.getEmail();
    const password = 'Idg' + crypto.randomBytes(8).toString('hex') + '1!';

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://ideogram.ai',
        'Referer': 'https://ideogram.ai/'
    };

    // Register
    await axios.post('https://ideogram.ai/api/account/register', {
        email, password,
        username: 'user_' + crypto.randomBytes(4).toString('hex')
    }, { headers, timeout: 15000 });

    const code = await tempMail.waitForCode();
    if (!code) throw new Error('Ideogram: OTP timeout');

    await axios.post('https://ideogram.ai/api/account/verify-email', {
        email, code
    }, { headers, timeout: 15000 });

    const loginRes = await axios.post('https://ideogram.ai/api/account/login', {
        email, password
    }, { headers, timeout: 15000 });

    const token = loginRes.data?.token;
    const authHeaders = { ...headers, ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };

    const genRes = await axios.post('https://ideogram.ai/api/images/sample', {
        prompt,
        aspect_ratio: 'ASPECT_1_1',
        model_version: 'V_2',
        magic_prompt_option: 'AUTO'
    }, { headers: authHeaders, timeout: 60000 });

    const images = genRes.data?.response?.data || genRes.data?.data || [];
    if (!images.length) throw new Error('Ideogram: tidak ada gambar');
    return images.map(img => img.url || img.image_url).filter(Boolean);
}

// ==================== TENSOR.ART ====================
async function generateTensorArt(prompt) {
    const tempMail = new TempMailScraper();
    const email = await tempMail.getEmail();
    const password = 'Tns' + crypto.randomBytes(8).toString('hex') + '1!';

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://tensor.art',
        'Referer': 'https://tensor.art/'
    };

    await axios.post('https://tensor.art/api/user/register', {
        email, password
    }, { headers, timeout: 15000 });

    const code = await tempMail.waitForCode();
    if (!code) throw new Error('TensorArt: OTP timeout');

    await axios.post('https://tensor.art/api/user/verify', {
        email, code
    }, { headers, timeout: 15000 });

    const loginRes = await axios.post('https://tensor.art/api/user/login', {
        email, password
    }, { headers, timeout: 15000 });

    const token = loginRes.data?.data?.token || loginRes.data?.token;
    if (!token) throw new Error('TensorArt: login gagal');

    const authHeaders = { ...headers, 'Authorization': `Bearer ${token}` };

    const genRes = await axios.post('https://tensor.art/api/job/create', {
        stages: [{
            type: 'INPUT_INITIALIZE',
            inputInitialize: { seed: -1, count: 1 }
        }, {
            type: 'DIFFUSION',
            diffusion: {
                width: 512, height: 512,
                prompts: [{ text: prompt }],
                negativePrompts: [{ text: 'blurry, bad quality' }],
                sdModel: '600423083519508503',
                sdVae: 'ae.safetensors',
                sampler: 'Euler',
                steps: 20,
                cfgScale: 7
            }
        }]
    }, { headers: authHeaders, timeout: 30000 });

    const jobId = genRes.data?.data?.job?.id || genRes.data?.job?.id;
    if (!jobId) throw new Error('TensorArt: gagal dapat job ID');

    for (let i = 0; i < 60; i++) {
        await delay(3000);
        const statusRes = await axios.get(`https://tensor.art/api/job/${jobId}`, {
            headers: authHeaders, timeout: 10000
        });
        const job = statusRes.data?.data?.job || statusRes.data?.job;
        if (job?.status === 'SUCCESS' || job?.status === 'FINISHED') {
            const images = job?.images || job?.successInfo?.images || [];
            return images.map(img => img.url).filter(Boolean);
        }
        if (job?.status === 'FAILED') throw new Error('TensorArt: generate gagal');
    }

    throw new Error('TensorArt: timeout');
}

// ==================== ENDPOINT ====================
module.exports = function(app) {
    /**
     * ENDPOINT: GET /ai/txt2img?prompt=beautiful lake
     * ENDPOINT: GET /ai/txt2img?prompt=beautiful lake&source=ideogram
     * ENDPOINT: GET /ai/txt2img?prompt=beautiful lake&source=tensorart
     *
     * Query Params:
     *   - prompt : deskripsi gambar (wajib)
     *   - source : "ideogram" / "tensorart" / "auto" (default: auto)
     */
    app.get('/ai/txt2img', async (req, res) => {
        const { prompt, source = 'auto' } = req.query;

        if (!prompt) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'prompt' wajib diisi! Contoh: /ai/txt2img?prompt=beautiful lake"
            });
        }

        let images = [];
        let usedSource = '';
        let lastError = '';

        if (source === 'ideogram' || source === 'auto') {
            try {
                images = await generateIdeogram(prompt);
                usedSource = 'ideogram';
            } catch (e) {
                lastError = `Ideogram: ${e.message}`;
            }
        }

        if ((source === 'tensorart' || source === 'auto') && images.length === 0) {
            try {
                images = await generateTensorArt(prompt);
                usedSource = 'tensorart';
            } catch (e) {
                lastError = `TensorArt: ${e.message}`;
            }
        }

        if (images.length === 0) {
            return res.status(500).json({ status: false, error: lastError || 'Semua source gagal' });
        }

        res.json({
            status: true,
            prompt,
            source: usedSource,
            total: images.length,
            images
        });
    });
};
