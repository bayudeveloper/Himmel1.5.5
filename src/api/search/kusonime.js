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

            $('.postlist .kover').each((i, el) => {
                const title = $(el).find('h2 a').text().trim();
                const url = $(el).find('h2 a').attr('href');
                const thumbnail = $(el).find('img').attr('src');
                
                const genres = [];
                $(el).find('.genrenya a').each((_, g) => {
                    genres.push($(g).text().trim());
                });

                const description = $(el).find('.deskripsi').text().trim();
                const rating = $(el).find('.rating').text().trim();

                if (title && url) {
                    results.push({
                        title,
                        url,
                        thumbnail: thumbnail || null,
                        genres: genres,
                        description: description || null,
                        rating: rating || null
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