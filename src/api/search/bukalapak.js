const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function searchBukalapak(query) {
        try {
            const { data } = await axios.get(`https://www.bukalapak.com/products?search[keywords]=${encodeURIComponent(query)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'id,en;q=0.9',
                    'Referer': 'https://www.bukalapak.com/'
                },
                timeout: 15000
            });

            const $ = cheerio.load(data);
            const results = [];

            $('.bl-product-card').each((i, el) => {
                const title = $(el).find('.bl-product-card__description-name').text().trim();
                const priceText = $(el).find('.bl-product-card__description-price').text().trim();
                const linkElement = $(el).find('a.bl-product-card__wrapper');
                const link = linkElement.attr('href');
                const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
                const location = $(el).find('.bl-product-card__location').text().trim();
                
                // Parse rating
                let rating = null;
                const ratingElement = $(el).find('.bl-product-card__description-rating');
                if (ratingElement.length) {
                    const ratingText = ratingElement.text().trim();
                    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
                    if (ratingMatch) rating = parseFloat(ratingMatch[1]);
                }

                // Parse price
                const price = priceText.replace(/[^0-9]/g, '');
                const formattedPrice = price ? `Rp ${parseInt(price).toLocaleString('id-ID')}` : null;

                if (title && link) {
                    results.push({
                        title,
                        price: formattedPrice,
                        location: location || 'Indonesia',
                        rating: rating,
                        link: link.startsWith('http') ? link : `https://www.bukalapak.com${link}`,
                        image: image || null
                    });
                }
            });

            return results;
        } catch (error) {
            console.error("Bukalapak search error:", error.message);
            throw new Error("Gagal mencari produk di Bukalapak");
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