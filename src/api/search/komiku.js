const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function searchKomiku(query) {
        try {
            const { data } = await axios.get(`https://komiku.id/?s=${encodeURIComponent(query)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const $ = cheerio.load(data);
            const results = [];

            $('.daftar .bge').each((i, el) => {
                const title = $(el).find('h3').text().trim();
                const url = $(el).find('a').attr('href');
                const image = $(el).find('img').attr('src');
                const genre = $(el).find('.genre').text().trim();
                
                if (title && url) {
                    results.push({
                        title,
                        url,
                        image: image || null,
                        genre: genre || 'Unknown'
                    });
                }
            });

            return results;
        } catch (err) {
            throw err;
        }
    }

    app.get("/search/komiku", async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                error: "Parameter q required"
            });
        }

        try {
            const results = await searchKomiku(q);
            
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