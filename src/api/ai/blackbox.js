const axios = require('axios');

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
            // Step 1: Ambil token VQD dari DuckDuckGo
            const statusRes = await axios.get('https://duckduckgo.com/duckchat/v1/status', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'x-vqd-accept': '1'
                },
                timeout: 10000
            });

            const vqd = statusRes.headers['x-vqd-4'];
            if (!vqd) throw new Error('Gagal mendapatkan token VQD');

            // Step 2: Kirim pesan
            const chatRes = await axios.post('https://duckduckgo.com/duckchat/v1/chat', {
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'user', content: text }
                ]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/event-stream',
                    'x-vqd-4': vqd,
                    'Origin': 'https://duckduckgo.com',
                    'Referer': 'https://duckduckgo.com/'
                },
                timeout: 30000,
                responseType: 'text'
            });

            // Parse SSE response
            let result = '';
            const lines = chatRes.data.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') break;
                    try {
                        const json = JSON.parse(data);
                        if (json.message) result += json.message;
                    } catch (e) {}
                }
            }

            if (!result) throw new Error('Response kosong');

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
