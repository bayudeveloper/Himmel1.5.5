const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function searchBukalapak(query) {
        try {
            const { data } = await axios.get(`https://www.bukalapak.com/products?search[keywords]=${encodeURIComponent(query)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const $ = cheerio.load(data);
            const results = [];

            $('.bl-product-card').each((i, el) => {
                const title = $(el).find('.bl-product-card__description-name').text().trim();
                const price = $(el).find('.bl-product-card__description-price').text().trim();
                const link = $(el).find('a.bl-product-card__wrapper').attr('href');
                const image = $(el).find('img').attr('src');
                const location = $(el).find('.bl-product-card__location').text().trim();
                const rating = $(el).find('.bl-product-card__description-rating').text().trim();

                if (title && price) {
                    results.push({
                        title,
                        price,
                        location: location || 'Unknown',
                        rating: rating || 'No rating',
                        link: link || null,
                        image: image || null
                    });
                }
            });

            return results.slice(0, 15);
        } catch (error) {
            throw error;
        }
    }

    app.get("/search/bukalapak", async (req, res) => {
        const query = req.query.q || req.query.search;

        if (!query) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?q="
            });
        }

        try {
            const results = await searchBukalapak(query);

            res.json({
                status: true,
                query: query,
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