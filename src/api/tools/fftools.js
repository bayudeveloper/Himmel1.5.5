const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    app.get("/tools/fftools", async (req, res) => {
        if (req.query.type !== "all") {
            return res.json({ 
                status: false, 
                message: "Gunakan ?type=all" 
            });
        }

        try {
            const [charsRes, petsRes, newsRes] = await Promise.all([
                axios.get("https://ff.garena.com/id/chars/"),
                axios.get("https://ff.garena.com/id/pets/"),
                axios.get("https://ff.garena.com/id/news/")
            ]);

            const $chars = cheerio.load(charsRes.data);
            const $pets = cheerio.load(petsRes.data);
            const $news = cheerio.load(newsRes.data);

            let characters = [];
            let pets = [];
            let news = [];

            $chars(".char-box.char-box-new").each((i, el) => {
                characters.push($chars(el).find(".char-item-name").text().trim());
            });

            $pets(".pet-box.pet-box-new").each((i, el) => {
                pets.push($pets(el).find(".pet-name").text().trim());
            });

            $news(".news-item.news-elem").each((i, el) => {
                news.push($news(el).find(".news-title").text().trim());
            });

            res.json({
                status: true,
                total: {
                    characters: characters.length,
                    pets: pets.length,
                    news: news.length,
                },
                data: { characters, pets, news }
            });

        } catch (err) {
            res.status(500).json({ 
                status: false, 
                message: err.message 
            });
        }
    });
};