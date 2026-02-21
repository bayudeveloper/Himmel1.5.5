const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function getJKT48News() {
        try {
            const { data } = await axios.get('https://jkt48.com/news/list?lang=id', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'id,en;q=0.9',
                    'Referer': 'https://jkt48.com/'
                },
                timeout: 15000
            });

            const $ = cheerio.load(data);
            const news = [];

            $('.entry-news__list').each((i, el) => {
                const title = $(el).find('h3 a').text().trim();
                const link = $(el).find('h3 a').attr('href');
                const rawDate = $(el).find('.time').text().trim() || $(el).find('time').text().trim();
                
                // Parse date
                let date = rawDate;
                if (rawDate) {
                    const dateMatch = rawDate.match(/\d{4}\.\d{2}\.\d{2}/);
                    if (dateMatch) {
                        date = dateMatch[0].replace(/\./g, '-');
                    }
                }

                if (title) {
                    news.push({
                        title: title,
                        link: link ? (link.startsWith('http') ? link : `https://jkt48.com${link}`) : null,
                        date: date || new Date().toISOString().split('T')[0]
                    });
                }
            });

            return news;
        } catch (error) {
            console.error("JKT48 scraping error:", error.message);
            throw new Error("Gagal mengambil berita JKT48");
        }
    }

    app.get("/info/jkt48", async (req, res) => {
        try {
            const news = await getJKT48News();

            res.json({
                status: true,
                source: "jkt48.com",
                total: news.length,
                data: news
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};