const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function emojiMix(emoji1, emoji2) {
        try {
            const response = await axios.get(`https://emojimix.com/${encodeURIComponent(emoji1)}/${encodeURIComponent(emoji2)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const $ = cheerio.load(response.data);
            const image = $('meta[property="og:image"]').attr('content');
            
            if (image) {
                return {
                    image: image,
                    url: `https://emojimix.com/${emoji1}/${emoji2}`
                };
            }
            throw new Error('Emoji combination not found');
        } catch (err) {
            throw err;
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