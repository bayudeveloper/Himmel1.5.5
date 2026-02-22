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

// ==================== DEEPSEEK ====================
class DeepSeek {
    constructor() {
        this.baseUrl = 'https://chat.deepseek.com';
        this.apiUrl = 'https://chat.deepseek.com/api/v0';
        this.tempMail = new TempMailScraper();
        this.token = '';
        this.cookies = '';
        this.defaultHeaders = {
            'accept': '*/*',
            'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'content-type': 'application/json',
            'origin': 'https://chat.deepseek.com',
            'referer': 'https://chat.deepseek.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
    }

    saveCookies(setCookieHeader) {
        if (setCookieHeader && setCookieHeader.length > 0) {
            this.cookies = setCookieHeader.map(c => c.split(';')[0]).join('; ');
        }
    }

    getAuthHeaders() {
        return {
            ...this.defaultHeaders,
            ...(this.token ? { 'authorization': `Bearer ${this.token}` } : {}),
            ...(this.cookies ? { 'cookie': this.cookies } : {})
        };
    }

    async initialize() {
        const email = await this.tempMail.getEmail();
        const password = crypto.randomBytes(12).toString('hex') + 'Aa1!';

        // Step 1: Register
        await this.register(email, password);

        // Step 2: Tunggu OTP
        const code = await this.tempMail.waitForCode();
        if (!code) throw new Error('Gagal mendapatkan kode OTP');

        // Step 3: Verify OTP
        await this.verifyEmail(email, code);

        // Step 4: Login
        await this.login(email, password);
    }

    async register(email, password) {
        const response = await axios.post(`${this.apiUrl}/users/register`, {
            email,
            password,
            username: email.split('@')[0]
        }, {
            headers: this.defaultHeaders,
            timeout: 15000
        });
        this.saveCookies(response.headers['set-cookie']);
        return response.data;
    }

    async verifyEmail(email, code) {
        const response = await axios.post(`${this.apiUrl}/users/verify_email`, {
            email,
            code
        }, {
            headers: this.getAuthHeaders(),
            timeout: 15000
        });
        this.saveCookies(response.headers['set-cookie']);
        if (response.data?.data?.token) this.token = response.data.data.token;
        return response.data;
    }

    async login(email, password) {
        const response = await axios.post(`${this.apiUrl}/users/login`, {
            email,
            password
        }, {
            headers: this.defaultHeaders,
            timeout: 15000
        });
        this.saveCookies(response.headers['set-cookie']);
        const token = response.data?.data?.user?.token || response.data?.token;
        if (token) this.token = token;
        return response.data;
    }

    async createChat() {
        const response = await axios.post(`${this.apiUrl}/chat_session/create`, {
            character_id: null
        }, {
            headers: this.getAuthHeaders(),
            timeout: 15000
        });
        this.saveCookies(response.headers['set-cookie']);
        return response.data?.data?.biz_data?.id;
    }

    async sendMessage(chatId, message) {
        const response = await axios.post(`${this.apiUrl}/chat/completion`, {
            chat_session_id: chatId,
            parent_message_id: null,
            prompt: message,
            ref_file_ids: [],
            thinking_enabled: false,
            search_enabled: false
        }, {
            headers: this.getAuthHeaders(),
            timeout: 60000,
            responseType: 'text'
        });

        this.saveCookies(response.headers['set-cookie']);

        // Parse streaming response (Server-Sent Events)
        const text = response.data;
        let fullResponse = '';
        let thinking = '';

        const lines = text.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.choices?.[0]?.delta?.content) {
                        fullResponse += data.choices[0].delta.content;
                    }
                    if (data.choices?.[0]?.delta?.reasoning_content) {
                        thinking += data.choices[0].delta.reasoning_content;
                    }
                } catch (e) {}
            }
        }

        if (!fullResponse) {
            // Fallback: coba parse sebagai JSON biasa
            try {
                const json = JSON.parse(text);
                fullResponse = json?.data?.choices?.[0]?.message?.content ||
                               json?.choices?.[0]?.message?.content ||
                               json?.message || '';
            } catch (e) {}
        }

        return { response: fullResponse, thinking };
    }

    async chat(message) {
        await this.initialize();
        const chatId = await this.createChat();
        return await this.sendMessage(chatId, message);
    }
}

// ==================== ENDPOINT ====================
module.exports = function(app) {

    /**
     * ENDPOINT: GET /ai/deepseek?text=halo siapa kamu
     * Desc: Chat dengan DeepSeek AI (auto login via temp mail)
     * 
     * Query Params:
     *   - text : pesan yang mau dikirim (wajib)
     */
    app.get('/ai/deepseek', async (req, res) => {
        const { text } = req.query;

        if (!text) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'text' wajib diisi! Contoh: /ai/deepseek?text=halo siapa kamu"
            });
        }

        try {
            const ds = new DeepSeek();
            const result = await ds.chat(text);

            res.json({
                status: true,
                query: text,
                result: result.response,
                ...(result.thinking ? { thinking: result.thinking } : {})
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};
