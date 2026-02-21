const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function searchKusonime(query) {
        try {
            const { data } = await axios.get(`https://kusonime.com/?s=${encodeURIComponent(query)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const $ = cheerio.load(data);
            const results = [];

            $('.venz .detpost').each((i, el) => {
                const title = $(el).find('.content h2 a').text().trim();
                const url = $(el).find('.content h2 a').attr('href');
                const thumbnail = $(el).find('.thumbz img').attr('src');
                const genre = $(el).find('.content p:contains("Genre")').text().replace('Genre : ', '').trim();
                
                if (title && url) {
                    results.push({
                        title,
                        url,
                        thumbnail: thumbnail || null,
                        genre: genre || 'Unknown'
                    });
                }
            });

            return results;
        } catch (err) {
            throw err;
        }
    }

    app.get("/search/kusonime", async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                error: "Parameter q required"
            });
        }

        try {
            const results = await searchKusonime(q);
            
            res.json({
                status: true,
                query: q,
                total: results.length,
                data: results
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};