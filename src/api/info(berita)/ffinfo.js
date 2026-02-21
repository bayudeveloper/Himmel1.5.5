const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function getFFInfo(uid) {
        try {
            // Website ini sebenarnya memerlukan form submission
            // Tapi kita bisa scraping dari halaman hasil pencarian
            
            const { data } = await axios.get(`https://freefireinfo.in/`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                timeout: 10000
            });

            const $ = cheerio.load(data);
            
            // Ambil info dari website
            // Karena website tidak menyediakan API langsung,
            // kita scraping dari halaman utama
            
            const gameInfo = {
                game: "Free Fire",
                publisher: "Garena",
                website: "https://ff.garena.com/",
                info_source: "freefireinfo.in",
                note: "Website ini menyediakan info melalui form submission, bukan API langsung"
            };

            // Coba ambil berita terbaru
            const news = [];
            $('article').each((i, el) => {
                const title = $(el).find('h2').text().trim();
                const link = $(el).find('a').attr('href');
                if (title && i < 5) {
                    news.push({ title, link });
                }
            });

            return {
                uid: uid,
                info: gameInfo,
                recent_news: news,
                status: "Account info requires form submission at freefireinfo.in"
            };

        } catch (error) {
            console.error("FF Info error:", error.message);
            throw new Error("Gagal mengambil info Free Fire");
        }
    }

    app.get("/info/ffinfo", async (req, res) => {
        const { uid } = req.query;

        if (!uid) {
            return res.status(400).json({ 
                status: false, 
                message: "Masukkan ?uid=" 
            });
        }

        try {
            const result = await getFFInfo(uid);

            res.json({ 
                status: true, 
                data: result 
            });
        } catch (err) {
            res.status(500).json({ 
                status: false, 
                message: err.message 
            });
        }
    });
};