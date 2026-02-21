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
            const formData = new URLSearchParams();
            formData.append('text', text);
            formData.append('lc', lang);

            const response = await axios.post(
                'https://api.simsimi.vn/v2/simtalk',
                formData,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                }
            );

            res.json({
                status: true,
                language: lang,
                reply: response.data.message || response.data.msg || "No reply"
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.response?.data?.message || err.message
            });
        }
    });
};