const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    app.get("/info/ffinfo", async (req, res) => {
        const { type, id } = req.query;

        if (!type || !id) {
            return res.json({ 
                status: false, 
                message: "Masukkan ?type= & ?id=" 
            });
        }

        try {
            let hasil;

            if (type === "character") {
                const response = await axios.get(`https://ff.garena.com/id/chars/${id}`);
                const $ = cheerio.load(response.data);

                hasil = {
                    title: $(".skill-profile-title").text().trim(),
                    name: $(".skill-profile-name").text().trim(),
                    skill: $(".skill-introduction").text().trim(),
                };
            } else if (type === "pet") {
                const response = await axios.get(`https://ff.garena.com/id/pets/${id}`);
                const $ = cheerio.load(response.data);

                hasil = {
                    name: $(".skill-profile-name").text().trim(),
                    skill: $(".skill-introduction").text().trim(),
                };
            } else {
                return res.json({ 
                    status: false, 
                    message: "Type tidak valid" 
                });
            }

            res.json({ 
                status: true, 
                data: hasil 
            });

        } catch (err) {
            res.status(500).json({ 
                status: false, 
                message: err.message 
            });
        }
    });
};