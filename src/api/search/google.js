const https = require("https");
const cheerio = require("cheerio");

module.exports = function(app) {
    function googleSearch(query) {
        return new Promise((resolve, reject) => {
            const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const $ = cheerio.load(data);
                        const results = [];

                        $('div.g').each((i, el) => {
                            const title = $(el).find('h3').text();
                            const link = $(el).find('a').attr('href');
                            const snippet = $(el).find('div.VwiC3b').text();

                            if (title && link) {
                                const cleanLink = link.split('&')[0].replace('/url?q=', '');
                                if (cleanLink.startsWith('http')) {
                                    results.push({
                                        title,
                                        link: cleanLink,
                                        snippet: snippet || 'No description'
                                    });
                                }
                            }
                        });

                        resolve(results.slice(0, 10));
                    } catch (err) {
                        reject(err);
                    }
                });
            }).on('error', reject);
        });
    }

    app.get("/search/google", async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?q="
            });
        }

        try {
            const results = await googleSearch(q);
            
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