const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function searchSoundCloud(query) {
        try {
            const url = `https://soundcloud.com/search?q=${encodeURIComponent(query)}`;
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });

            const $ = cheerio.load(data);
            let results = [];

            $('li').each((i, el) => {
                const title = $(el).find('a').attr('aria-label');
                const href = $(el).find('a').attr('href');
                
                if (title && href && href.includes('/')) {
                    results.push({
                        title: title,
                        url: href.startsWith('http') ? href : `https://soundcloud.com${href}`
                    });
                }
            });

            return results.slice(0, 10);
        } catch (error) {
            return [];
        }
    }

    app.get("/downloader/soundcloud", async (req, res) => {
        const query = req.query.query;

        if (!query) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?query="
            });
        }

        try {
            const results = await searchSoundCloud(query);

            res.json({
                status: true,
                total: results.length,
                data: results
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};