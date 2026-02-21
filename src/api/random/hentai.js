const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    app.get("/random/hentai", async (req, res) => {
        try {
            const page = Math.floor(Math.random() * 100) + 1;
            
            const response = await axios.get(`https://hentaihaven.xxx/page/${page}/`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const results = [];

            $('article').each((i, el) => {
                const title = $(el).find('.entry-title a').text().trim();
                const link = $(el).find('.entry-title a').attr('href');
                const image = $(el).find('img').attr('src');
                
                if (title && link) {
                    results.push({
                        title,
                        link,
                        image: image || null
                    });
                }
            });

            res.json({
                status: true,
                page: page,
                total: results.length,
                data: results.slice(0, 10)
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};