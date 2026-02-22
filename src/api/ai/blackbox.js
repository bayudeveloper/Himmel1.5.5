const axios = require('axios');
const crypto = require('crypto');

const uuidv4 = () => crypto.randomUUID();

module.exports = function(app) {

    /**
     * ENDPOINT: GET /ai/blackbox?text=halo siapa kamu
     * Desc: Chat dengan Blackbox AI (tanpa login, tanpa API key)
     */
    app.get('/ai/blackbox', async (req, res) => {
        const { text } = req.query;

        if (!text) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'text' wajib diisi! Contoh: /ai/blackbox?text=halo siapa kamu"
            });
        }

        try {
            const msgId = uuidv4();
            const sessionId = uuidv4();

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
                userSystemPrompt: null,
                maxTokens: 1024,
                playgroundTopP: 0.9,
                playgroundTemperature: 0.5,
                isChromeExt: false,
                githubToken: null,
                clickedAnswer2: false,
                clickedAnswer3: false,
                clickedForceWebSearch: false,
                visitFromDelta: false,
                mobileClient: false,
                webSearchModePrompt: false,
                userSelectedModel: null
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Origin': 'https://www.blackbox.ai',
                    'Referer': 'https://www.blackbox.ai/'
                },
                timeout: 30000
            });

            let result = response.data;

            // Blackbox kadang return string langsung, kadang JSON
            if (typeof result === 'object') {
                result = result?.response || result?.message || JSON.stringify(result);
            }

            // Bersihkan dari karakter aneh
            if (typeof result === 'string') {
                result = result.replace(/\$@\$v=undefined-rv1\$@\$/g, '').trim();
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
