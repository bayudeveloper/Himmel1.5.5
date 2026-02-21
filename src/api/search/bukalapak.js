const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function scrapeBukalapak(search) {
        try {
            const url = `https://www.bukalapak.com/products?search[keywords]=${encodeURIComponent(search)}`;

            const { data } = await axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                },
                timeout: 15000
            });

            const $ = cheerio.load(data);
            const results = [];

            $(".bl-product-card").each((i, el) => {
                const title = $(el).find(".bl-product-card__description-name").text().trim();
                const price = $(el).find(".bl-product-card__description-price").text().trim();
                const rating = $(el).find(".bl-product-card__description-rating").text().trim();
                const link = $(el).find("a").attr("href");
                const image = $(el).find("img").attr("src");

                if (title && price) {
                    results.push({
                        title,
                        price,
                        rating: rating || "No rating",
                        link: link ? `https://www.bukalapak.com${link}` : null,
                        image
                    });
                }
            });

            return {
                status: true,
                total: results.length,
                data: results
            };

        } catch (error) {
            return {
                status: false,
                error: error.message
            };
        }
    }

    app.get("/search/bukalapak", async (req, res) => {
        const search = req.query.search;

        if (!search) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?search="
            });
        }

        const result = await scrapeBukalapak(search);

        if (!result.status) {
            return res.status(500).json(result);
        }

        res.json({
            status: true,
            source: "Bukalapak",
            query: search,
            total: result.total,
            timestamp: new Date().toISOString(),
            results: result.data
        });
    });
};