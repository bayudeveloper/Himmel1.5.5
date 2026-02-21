const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

module.exports = function(app) {
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
                    } catch (err) {
                        console.error("Error checking inbox:", err.message);
                    }
                }, 5000);

                // Timeout after 2 minutes
                setTimeout(() => {
                    clearInterval(interval);
                    resolve(null);
                }, 120000);
            });
        }
    }

    class NananaGenerator {
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
            try {
                const response = await axios.post(
                    `${this.baseUrl}/api/auth/email-otp/send-verification-otp`,
                    { email, type: 'sign-in' },
                    { headers: this.defaultHeaders, timeout: 15000 }
                );
                return response.data;
            } catch (err) {
                throw new Error(`Send OTP failed: ${err.message}`);
            }
        }

        async verifyOtp(email, otp) {
            try {
                const response = await axios.post(
                    `${this.baseUrl}/api/auth/sign-in/email-otp`,
                    { email, otp },
                    { 
                        headers: this.defaultHeaders, 
                        withCredentials: true,
                        timeout: 15000
                    }
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
            } catch (err) {
                throw new Error(`Verify OTP failed: ${err.message}`);
            }
        }

        async uploadImage(imagePath) {
            try {
                const form = new FormData();
                form.append('image', fs.createReadStream(imagePath));

                const response = await axios.post(
                    `${this.baseUrl}/api/upload-img`,
                    form,
                    {
                        headers: {
                            ...this.defaultHeaders,
                            ...form.getHeaders(),
                            'Cookie': this.cookieString,
                            'x-fp-id': this.generateFpId()
                        },
                        timeout: 30000
                    }
                );

                return response.data;
            } catch (err) {
                throw new Error(`Upload image failed: ${err.message}`);
            }
        }

        async generateImage(imageUrl, prompt) {
            try {
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
            } catch (err) {
                throw new Error(`Generate image failed: ${err.message}`);
            }
        }

        async getResult(requestId) {
            try {
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
            } catch (err) {
                throw new Error(`Get result failed: ${err.message}`);
            }
        }

        async processImage(imagePath, prompt) {
            try {
                const uploadResult = await this.uploadImage(imagePath);
                if (!uploadResult || !uploadResult.url) {
                    throw new Error("Upload failed: no URL returned");
                }

                const generateResult = await this.generateImage(uploadResult.url, prompt);
                if (!generateResult || !generateResult.request_id) {
                    throw new Error("Generation failed: no request_id");
                }

                const maxAttempts = 30; // 60 seconds max (2s * 30)
                for (let i = 0; i < maxAttempts; i++) {
                    const result = await this.getResult(generateResult.request_id);
                    
                    if (result.completed) {
                        return result;
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                throw new Error("Timeout waiting for result");
            } catch (err) {
                throw new Error(`Process image failed: ${err.message}`);
            }
        }
    }

    // POST endpoint - upload file langsung
    app.post('/ai/nanana', async (req, res) => {
        try {
            if (!req.files || !req.files.image) {
                return res.status(400).json({
                    status: false,
                    message: "Upload file image dengan field 'image'"
                });
            }

            const { prompt } = req.body;
            if (!prompt) {
                return res.status(400).json({
                    status: false,
                    message: "Parameter 'prompt' wajib diisi"
                });
            }

            const imageFile = req.files.image;
            const tempPath = path.join('/tmp', `nanana_${Date.now()}_${imageFile.name}`);
            
            // Simpan file sementara
            await imageFile.mv(tempPath);

            try {
                const generator = new NananaGenerator();
                
                // Initialize with temp mail
                await generator.initialize();

                // Process image
                const result = await generator.processImage(tempPath, prompt);

                // Hapus file sementara
                fs.unlinkSync(tempPath);

                res.json({
                    status: true,
                    data: result
                });

            } catch (err) {
                // Hapus file sementara kalo error
                if (fs.existsSync(tempPath)) {
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

    // GET endpoint - info
    app.get('/ai/nanana', (req, res) => {
        res.json({
            status: true,
            name: "Nanana Image Generator",
            description: "Generate images using AI with image-to-image transformation",
            usage: {
                method: "POST",
                endpoint: "/ai/nanana",
                body: {
                    image: "file (multipart/form-data)",
                    prompt: "string - description of desired transformation"
                }
            },
            example: "curl -X POST -F 'image=@photo.jpg' -F 'prompt=konser' http://localhost:3000/ai/nanana"
        });
    });
};