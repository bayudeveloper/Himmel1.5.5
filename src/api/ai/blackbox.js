const axios = require('axios');
const crypto = require('crypto');

module.exports = function(app) {

    app.get('/ai/blackbox', async (req, res) => {
        const { text } = req.query;

        if (!text) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'text' wajib diisi! Contoh: /ai/blackbox?text=halo siapa kamu"
            });
        }

        try {
            const msgId = crypto.randomUUID();
            const sessionId = crypto.randomUUID();

            const response = await axios.post('https://www.blackbox.ai/api/chat', {
                messages: [
                    {
                        id: msgId,
                        content: text,
                        role: 'user'
                    }
                ],
                id: sessionId,
                previewToken: null,
                userId: null,
                codeModelMode: true,
                agentMode: {},
                trendingAgentMode: {},
                isMicMode: false,
                maxTokens: 1024,
                playgroundTopP: null,
                playgroundTemperature: null,
                isChromeExt: false,
                githubToken: null,
                clickedAnswer2: false,
                clickedAnswer3: false,
                clickedForceWebSearch: false,
                visitFromDelta: false,
                mobileClient: false,
                userSelectedModel: null,
                validated: '69783381-2ce4-4dbd-ac78-35e9063feabc'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Origin': 'https://www.blackbox.ai',
                    'Referer': 'https://www.blackbox.ai/',
                    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin'
                },
                timeout: 30000
            });

            let result = response.data;

            if (typeof result === 'object') {
                result = result?.response || result?.message || result?.choices?.[0]?.message?.content || JSON.stringify(result);
            }

            if (typeof result === 'string') {
                // Bersihkan token aneh dari Blackbox
                result = result
                    .replace(/\$@\$v=undefined-rv1\$@\$/g, '')
                    .replace(/\$@\$.+?\$@\$/g, '')
                    .trim();
            }

            if (!result) {
                return res.status(500).json({
                    status: false,
                    error: 'Response kosong dari Blackbox AI'
                });
            }

            res.json({
                status: true,
                query: text,
                result
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};
