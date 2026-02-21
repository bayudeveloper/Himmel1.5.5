const axios = require('axios');

module.exports = function(app) {
    const bahasaValid = [
        'id', 'en', 'vn', 'he', 'zh', 'ch', 'ko', 'ph', 'ru', 'ar',
        'ms', 'es', 'pt', 'de', 'th', 'ja', 'fr', 'sv', 'tr', 'da'
    ];

    app.get('/ai/simi', async (req, res) => {
        const text = req.query.text;
        const lang = req.query.lang || 'id';

        if (!text) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?text="
            });
        }

        if (!bahasaValid.includes(lang)) {
            return res.status(400).json({
                status: false,
                message: "Bahasa tidak valid atau tidak didukung"
            });
        }

        try {
            // Gunakan API alternatif yang lebih stabil
            const response = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(text)}&lc=${lang}`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (response.data && response.data.success) {
                return res.json({
                    status: true,
                    language: lang,
                    reply: response.data.success
                });
            }

            // Fallback ke API lain
            const fallbackResponse = await axios.post('https://wsapi.simsimi.com/190410/talk', {
                "utext": text,
                "lang": lang
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            res.json({
                status: true,
                language: lang,
                reply: fallbackResponse.data.atext || fallbackResponse.data.message
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: "Layanan SimiSimi sedang sibuk, coba lagi nanti"
            });
        }
    });
};