const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function searchKomiku(type = "manga", name) {
        const { data } = await axios.get(
            `https://api.komiku.id/?post_type=${type}&s=${name}&APIKEY=undefined`
        );

        const $ = cheerio.load(data);
        const mangaList = [];

        $(".bge").each((_, elem) => {
            const title = $(elem).find("h3").text().trim();
            const genre = $(elem).find(".tpe1_inf b").text().trim();
            const description = $(elem).find("p").text().trim();
            const imageUrl = $(elem).find("img").attr("src");
            const mangaUrl = $(elem).find("a").attr("href");

            mangaList.push({
                title,
                genre,
                description,
                img: imageUrl,
                url: mangaUrl ? "https://komiku.id/" + mangaUrl : null
            });
        });

        return mangaList;
    }

    async function getDetail(url) {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const genres = [];
        $("ul.genre li").each((_, el) => {
            genres.push($(el).text().trim());
        });

        return {
            title: $('span[itemprop="name"]').text().trim(),
            description: $('p[itemprop="description"]').text().trim(),
            awalChapter: $('a[title*="Chapter 01"]').text().trim(),
            newChapter: $('a[title*="Chapter"]').last().text().trim(),
            coverImage: $('img[itemprop="image"]').attr("src"),
            genres
        };
    }

    app.get("/search/komiku", async (req, res) => {
        try {
            const { type, q } = req.query;

            if (!q) {
                return res.status(400).json({
                    status: false,
                    error: "Query parameter (q) is required"
                });
            }

            const result = await searchKomiku(type || "manga", q);

            res.status(200).json({
                status: true,
                total: result.length,
                result
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });

    app.get("/search/komiku/detail", async (req, res) => {
        try {
            const { url } = req.query;

            if (!url) {
                return res.status(400).json({
                    status: false,
                    error: "URL parameter is required"
                });
            }

            const result = await getDetail(url);

            res.status(200).json({
                status: true,
                result
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};