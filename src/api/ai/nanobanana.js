const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

module.exports = function(app) {
    // ==================== TEMP MAIL SCRAPER (LENGKAP DARI KODEMU) ====================
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
            try {
                const response = await axios.get(`${this.baseUrl}/api/list`, {
                    params: { recipient: this.recipient },
                    headers: { ...this.headers, referer: `https://akunlama.com/inbox/${this.recipient}/list` },
                    timeout: 10000
                });
                return response.data;
            } catch (err) {
                return [];
            }
        }

        async getMessageContent(msg) {
            try {
                const response = await axios.get(`${this.baseUrl}/api/getHtml`, {
                    params: { region: msg.storage.region, key: msg.storage.key },
                    headers: { ...this.headers, referer: `https://akunlama.com/inbox/${this.recipient}/message/${msg.storage.region}/${msg.storage.key}` },
                    timeout: 10000
                });
                return response.data;
            } catch (err) {
                return '';
            }
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

    // ==================== UPLOAD TO CATBOX (GANTI express-fileupload) ====================
    async function uploadToCatbox(filePath) {
        try {
            const form = new FormData();
            form.append('fileToUpload', fs.createReadStream(filePath));
            form.append('reqtype', 'fileupload');
            
            const response = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: {
                    ...form.getHeaders(),
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 30000
            });
            
            return response.data.trim();
        } catch (err) {
            throw new Error(`Catbox upload failed: ${err.message}`);
        }
    }

    // ==================== DOWNLOAD FROM URL ====================
    async function downloadFromUrl(url) {
        const tempPath = path.join('/tmp', `nanobanana_${Date.now()}_${path.basename(url)}`);
        const writer = fs.createWriteStream(tempPath);
        
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            timeout: 30000
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(tempPath));
            writer.on('error', reject);
        });
    }

    // ==================== NANANA CLASS (LENGKAP DARI KODEMU) ====================
    class Nanana {
        constructor() {
            this.baseUrl = 'https://nanana.app';
            this.tempMail = new TempMailScraper();
            this.sessionToken = '';
            this.cookieString = '';
            this.defaultHeaders = {
                'accept': '*/*',
                'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'origin': this.baseUrl,
                'referer': `${this.baseUrl}/en`,
                'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
            };
        }

        generateFpId() {
            const random = crypto.randomBytes(32).toString('hex');
            const timestamp = Date.now().toString();
            return Buffer.from(random + timestamp).toString('base64').slice(0, 128);
        }

        async initialize() {
            try {
                const email = await this.tempMail.getEmail();
                await this.sendOtp(email);
                const code = await this.tempMail.waitForCode();
                
                if (!code) {
                    throw new Error("Failed to get OTP code");
                }
                
                await this.verifyOtp(email, code);
                return true;
            } catch (err) {
                throw new Error(`Initialization failed: ${err.message}`);
            }
        }

        async sendOtp(email) {
            const response = await axios.post(
                `${this.baseUrl}/api/auth/email-otp/send-verification-otp`,
                { email, type: 'sign-in' },
                { headers: this.defaultHeaders, timeout: 15000 }
            );
            return response.data;
        }

        async verifyOtp(email, otp) {
            const response = await axios.post(
                `${this.baseUrl}/api/auth/sign-in/email-otp`,
                { email, otp },
                { headers: this.defaultHeaders, withCredentials: true, timeout: 15000 }
            );
            
            const setCookie = response.headers['set-cookie'];
            if (setCookie && setCookie.length > 0) {
                const sessionCookie = setCookie.find(c => c.includes('__Secure-better-auth.session_token'));
                if (sessionCookie) {
                    this.sessionToken = sessionCookie.split(';')[0];
                    this.cookieString = this.sessionToken;
                }
            }
            
            return response.data;
        }

        async uploadImage(imageUrl) {
            const response = await axios.post(
                `${this.baseUrl}/api/upload-img`,
                { image_url: imageUrl },
                {
                    headers: {
                        ...this.defaultHeaders,
                        'content-type': 'application/json',
                        'Cookie': this.cookieString,
                        'x-fp-id': this.generateFpId()
                    },
                    timeout: 30000
                }
            );

            return response.data;
        }

        async generateImage(imageUrl, prompt) {
            const response = await axios.post(
                `${this.baseUrl}/api/image-to-image`,
                { prompt, image_urls: [imageUrl] },
                {
                    headers: {
                        ...this.defaultHeaders,
                        'content-type': 'application/json',
                        'Cookie': this.cookieString,
                        'x-fp-id': this.generateFpId()
                    },
                    timeout: 30000
                }
            );

            return response.data;
        }

        async getResult(requestId) {
            const response = await axios.post(
                `${this.baseUrl}/api/get-result`,
                { requestId, type: 'image-to-image' },
                {
                    headers: {
                        ...this.defaultHeaders,
                        'content-type': 'application/json',
                        'Cookie': this.cookieString,
                        'x-fp-id': this.generateFpId()
                    },
                    timeout: 15000
                }
            );

            return response.data;
        }

        async processImage(imageUrl, prompt) {
            const uploadResult = await this.uploadImage(imageUrl);
            const generateResult = await this.generateImage(uploadResult.url || imageUrl, prompt);
            
            const maxAttempts = 60;
            for (let i = 0; i < maxAttempts; i++) {
                const result = await this.getResult(generateResult.request_id);
                if (result.completed) {
                    return result;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            throw new Error("Timeout waiting for result");
        }
    }

    // ==================== ENDPOINT UTAMA (SATU AJA) ====================
    app.post('/ai/nanobanana', async (req, res) => {
        try {
            const { prompt, image_url } = req.query;
            
            if (!prompt) {
                return res.status(400).json({
                    status: false,
                    message: "Parameter 'prompt' wajib diisi!"
                });
            }

            if (!image_url) {
                return res.status(400).json({
                    status: false,
                    message: "Parameter 'image_url' wajib diisi!"
                });
            }

            console.log(`🔄 Processing: prompt="${prompt}"`);

            // Download gambar dari URL
            let tempPath = null;
            try {
                tempPath = await downloadFromUrl(image_url);
                console.log(`📥 Image downloaded`);

                // Upload ke Catbox
                const catboxUrl = await uploadToCatbox(tempPath);
                console.log(`☁️ Uploaded to Catbox`);

                // Inisialisasi Nanana
                const generator = new Nanana();
                await generator.initialize();
                console.log(`✅ Nanana initialized`);

                // Process image
                const result = await generator.processImage(catboxUrl, prompt);
                console.log(`✅ Generation complete`);

                // Cleanup
                if (tempPath && fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }

                res.json({
                    status: true,
                    data: {
                        result_url: result.result_url || result.url || result.image_url
                    }
                });

            } catch (err) {
                if (tempPath && fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                throw err;
            }

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};