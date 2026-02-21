const axios = require("axios");

module.exports = function(app) {
    async function emojiMix(emoji1, emoji2) {
        try {
            // API dari emojimix.com
            const response = await axios.get(`https://emojimix-api.jeff5m4.workers.dev/`, {
                params: {
                    e1: emoji1,
                    e2: emoji2
                },
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (response.data && response.data.url) {
                return {
                    image: response.data.url,
                    emoji1,
                    emoji2
                };
            }

            // Coba API alternatif
            const response2 = await axios.get(`https://emojimix.vercel.app/api/${encodeURIComponent(emoji1)}/${encodeURIComponent(emoji2)}`, {
                timeout: 5000
            });

            if (response2.data && response2.data.url) {
                return {
                    image: response2.data.url,
                    emoji1,
                    emoji2
                };
            }

            throw new Error('No emoji mix found');

        } catch (err) {
            throw new Error(`Gagal menggabungkan emoji: ${err.message}`);
        }
    }

    app.get("/tools/emojimix", async (req, res) => {
        const { emoji1, emoji2 } = req.query;

        if (!emoji1 || !emoji2) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?emoji1= & emoji2="
            });
        }

        try {
            const result = await emojiMix(emoji1, emoji2);
            
            res.json({
                status: true,
                data: result
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};