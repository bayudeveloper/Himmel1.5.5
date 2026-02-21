const cheerio = require("cheerio");
const axios = require("axios");

module.exports = function(app) {
    async function getInfo() {
        const { data } = await axios.get("https://kusonime.com/");
        const $ = cheerio.load(data);
        const animeList = [];

        $(".venz .detpost").each((_, el) => {
            const element = $(el);

            const title = element.find(".content h2 a").text().trim();
            const url = element.find(".content h2 a").attr("href");
            const thumbnail = element.find(".thumbz img").attr("src");

            const genres = element
                .find('.content p:contains("Genre") a')
                .map((_, el) => $(el).text())
                .get();

            const releaseTime = element
                .find('.content p:contains("Released on")')
                .text()
                .replace("Released on ", "")
                .trim();

            animeList.push({
                title,
                url,
                thumbnail,
                genres,
                releaseTime
            });
        });

        return animeList;
    }

    async function searchAnime(query) {
        const { data } = await axios.get(
            `https://kusonime.com/?s=${encodeURIComponent(query)}`
        );

        const $ = cheerio.load(data);
        const results = [];

        $(".venz .detpost").each((_, el) => {
            const element = $(el);

            const title = element.find(".content h2 a").text().trim();
            const url = element.find(".content h2 a").attr("href");
            const thumbnail = element.find(".thumbz img").attr("src");

            const genres = element
                .find('.content p:contains("Genre") a')
                .map((_, el) => $(el).text())
                .get();

            const releaseTime = element
                .find('.content p:contains("Released on")')
                .text()
                .replace("Released on ", "")
                .trim();

            results.push({
                title,
                url,
                thumbnail,
                genres,
                releaseTime
            });
        });

        return results;
    }

    app.get("/search/kusonime", async (req, res) => {
        try {
            const result = await getInfo();

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

    app.get("/search/kusonime/search", async (req, res) => {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    status: false,
                    error: "Query parameter (q) is required"
                });
            }

            const result = await searchAnime(q);

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
};