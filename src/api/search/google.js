const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function googleSearch(query) {
        try {
            const { data } = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=id`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'id,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                },
                timeout: 10000
            });

            const $ = cheerio.load(data);
            const results = [];

            // Selector utama Google
            $('div.g').each((i, el) => {
                // Cari title
                const titleElement = $(el).find('h3');
                if (!titleElement.length) return;
                
                const title = titleElement.text().trim();
                
                // Cari link
                let link = null;
                const linkElement = $(el).find('a');
                if (linkElement.length) {
                    const href = linkElement.attr('href');
                    if (href && href.startsWith('/url?q=')) {
                        link = decodeURIComponent(href.replace('/url?q=', '').split('&')[0]);
                    }
                }
                
                // Cari snippet
                let snippet = '';
                const snippetElement = $(el).find('div.VwiC3b, div[data-content-feature="1"], div[style*="border-bottom"] ~ div');
                if (snippetElement.length) {
                    snippet = snippetElement.first().text().trim();
                }

                if (title && link && link.startsWith('http')) {
                    results.push({
                        title,
                        link,
                        snippet: snippet || 'No description available'
                    });
                }
            });

            // Jika tidak ada hasil, coba selector alternatif
            if (results.length === 0) {
                $('div.yuRUbf').each((i, el) => {
                    const title = $(el).find('h3').text().trim();
                    const link = $(el).find('a').attr('href');
                    
                    if (title && link && link.startsWith('http')) {
                        const snippet = $(el).parent().find('.VwiC3b').text().trim() || '';
                        results.push({ title, link, snippet });
                    }
                });
            }

            return results;
        } catch (error) {
            console.error("Google search error:", error.message);
            throw new Error("Gagal melakukan pencarian Google");
        }
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