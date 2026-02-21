const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function searchFFCharacters() {
        try {
            const { data } = await axios.get('https://ff.garena.com/id/chars/', {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = cheerio.load(data);
            const characters = [];

            $('.char-box').each((i, el) => {
                const name = $(el).find('.char-name').text().trim();
                const desc = $(el).find('.char-desc').text().trim();
                const link = $(el).find('a').attr('href');
                const id = link?.match(/\/(\d+)$/)?.[1];

                if (name) {
                    characters.push({
                        id: id || null,
                        name: name,
                        description: desc || null,
                        link: link ? `https://ff.garena.com${link}` : null
                    });
                }
            });

            return characters;
        } catch (err) {
            throw err;
        }
    }

    async function searchFFPets() {
        try {
            const { data } = await axios.get('https://ff.garena.com/id/pets/', {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = cheerio.load(data);
            const pets = [];

            $('.pet-box').each((i, el) => {
                const name = $(el).find('.pet-name').text().trim();
                const desc = $(el).find('.pet-desc').text().trim();
                const link = $(el).find('a').attr('href');
                const id = link?.match(/\/(\d+)$/)?.[1];

                if (name) {
                    pets.push({
                        id: id || null,
                        name: name,
                        description: desc || null,
                        link: link ? `https://ff.garena.com${link}` : null
                    });
                }
            });

            return pets;
        } catch (err) {
            throw err;
        }
    }

    async function searchFFNews() {
        try {
            const { data } = await axios.get('https://ff.garena.com/id/news/', {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = cheerio.load(data);
            const news = [];

            $('.news-item').each((i, el) => {
                const title = $(el).find('.news-title').text().trim();
                const date = $(el).find('.news-date').text().trim();
                const link = $(el).find('a').attr('href');
                const image = $(el).find('img').attr('src');

                if (title) {
                    news.push({
                        title: title,
                        date: date || null,
                        image: image || null,
                        link: link ? `https://ff.garena.com${link}` : null
                    });
                }
            });

            return news;
        } catch (err) {
            throw err;
        }
    }

    app.get("/search/ffsearch", async (req, res) => {
        const { type } = req.query;

        if (!type) {
            return res.status(400).json({ 
                status: false, 
                message: "Masukkan ?type= (characters/pets/news)" 
            });
        }

        try {
            let data = [];
            
            if (type === "characters") {
                data = await searchFFCharacters();
            } else if (type === "pets") {
                data = await searchFFPets();
            } else if (type === "news") {
                data = await searchFFNews();
            } else {
                return res.status(400).json({ 
                    status: false, 
                    message: "Type tidak valid. Pilih: characters, pets, news" 
                });
            }

            res.json({ 
                status: true, 
                type: type,
                total: data.length, 
                data: data.slice(0, 20)
            });
        } catch (err) {
            res.status(500).json({ 
                status: false, 
                message: err.message 
            });
        }
    });
};