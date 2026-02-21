const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    app.get("/info/jkt48", async (req, res) => {
        try {
            const { data } = await axios.get('https://jkt48.com/news/list?lang=id', {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const $ = cheerio.load(data);
            const news = [];

            $('.entry-news__list').each((i, el) => {
                const title = $(el).find('h3 a').text().trim();
                const link = $(el).find('h3 a').attr('href');
                const date = $(el).find('.time').text().trim();
                
                if (title) {
                    news.push({
                        title,
                        link: link ? `https://jkt48.com${link}` : null,
                        date: date || null
                    });
                }
            });

            res.json({
                status: true,
                total: news.length,
                data: news.slice(0, 10)
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};