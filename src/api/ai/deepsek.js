const axios = require('axios');
const crypto = require('crypto');

// ==================== GUERRILLA MAIL ====================
class GuerrillaMail {
    constructor() {
        this.baseUrl = 'https://api.guerrillamail.com/ajax.php';
        this.sessionId = '';
        this.emailAddress = '';
        this.lastSeenId = 0;
    }

    async getEmail() {
        const response = await axios.get(this.baseUrl, {
            params: { f: 'get_email_address', lang: 'en' },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        this.sessionId = response.data.sid_token;
        this.emailAddress = response.data.email_addr;
        return this.emailAddress;
    }

    async checkInbox() {
        const response = await axios.get(this.baseUrl, {
            params: {
                f: 'get_email_list',
                offset: 0,
                sid_token: this.sessionId,
                seq: this.lastSeenId
            },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        return response.data?.list || [];
    }

    async getEmailContent(mailId) {
        const response = await axios.get(this.baseUrl, {
            params: {
                f: 'fetch_email',
                email_id: mailId,
                sid_token: this.sessionId
            },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        return response.data?.mail_body || '';
    }

    extractCode(html) {
        const match = html.match(/\b(\d{6})\b/);
        return match ? match[1] : null;
    }

    async waitForCode() {
        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                try {
                    const emails = await this.checkInbox();
                    if (emails.length > 0) {
                        for (const email of emails) {
                            if (parseInt(email.mail_id) > this.lastSeenId) {
                                const body = await this.getEmailContent(email.mail_id);
                                const code = this.extractCode(body);
                                if (code) {
                                    clearInterval(interval);
                                    resolve(code);
                                    return;
                                }
                                this.lastSeenId = parseInt(email.mail_id);
                            }
                        }
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
        this.apiUrl = 'https://chat.deepseek.com/api/v0';
        this.mail = new GuerrillaMail();
        this.token = '';
        this.cookies = '';
        this.defaultHeaders = {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/json',
            'origin': 'https://chat.deepseek.com',
            'referer': 'https://chat.deepseek.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
    }

    saveCookies(headers) {
        const setCookie = headers['set-cookie'];
        if (setCookie?.length > 0) {
            this.cookies = setCookie.map(c => c.split(';')[0]).join('; ');
        }
    }

    getHeaders() {
        return {
            ...this.defaultHeaders,
            ...(this.token ? { 'authorization': `Bearer ${this.token}` } : {}),
            ...(this.cookies ? { 'cookie': this.cookies } : {})
        };
    }

    async initialize() {
        const email = await this.mail.getEmail();
        const password = 'Ds' + crypto.randomBytes(8).toString('hex') + '1!';

        // Register
        await this.register(email, password);

        // Tunggu OTP
        const code = await this.mail.waitForCode();
        if (!code) throw new Error('OTP tidak diterima. Coba lagi.');

        // Verify + Login
        await this.verifyEmail(email, code);
        await this.login(email, password);
    }

    async register(email, password) {
        const response = await axios.post(`${this.apiUrl}/users/register`, {
            email,
            password,
            username: 'user_' + crypto.randomBytes(4).toString('hex')
        }, { headers: this.defaultHeaders, timeout: 15000 });
        this.saveCookies(response.headers);
        return response.data;
    }

    async verifyEmail(email, code) {
        const response = await axios.post(`${this.apiUrl}/users/verify_email`, {
            email, code
        }, { headers: this.getHeaders(), timeout: 15000 });
        this.saveCookies(response.headers);
        const token = response.data?.data?.token || response.data?.token;
        if (token) this.token = token;
        return response.data;
    }

    async login(email, password) {
        const response = await axios.post(`${this.apiUrl}/users/login`, {
            email, password
        }, { headers: this.defaultHeaders, timeout: 15000 });
        this.saveCookies(response.headers);
        const token = response.data?.data?.user?.token ||
                      response.data?.data?.token ||
                      response.data?.token;
        if (token) this.token = token;
        return response.data;
    }

    async createChat() {
        const response = await axios.post(`${this.apiUrl}/chat_session/create`, {
            character_id: null
        }, { headers: this.getHeaders(), timeout: 15000 });
        this.saveCookies(response.headers);
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
            headers: this.getHeaders(),
            timeout: 60000,
            responseType: 'text'
        });

        this.saveCookies(response.headers);

        // Parse SSE streaming response
        let fullResponse = '';
        let thinking = '';
        const lines = response.data.split('\n');

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

        // Fallback JSON biasa
        if (!fullResponse) {
            try {
                const json = JSON.parse(response.data);
                fullResponse = json?.data?.choices?.[0]?.message?.content ||
                               json?.choices?.[0]?.message?.content || '';
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
     * Desc: Chat dengan DeepSeek AI (auto login via Guerrilla Mail)
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
