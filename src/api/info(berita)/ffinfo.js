const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function(app) {
    async function getCharacterDetail(id) {
        try {
            const { data } = await axios.get(`https://ff.garena.com/id/chars/${id}/`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const $ = cheerio.load(data);
            
            return {
                name: $('.char-name').text().trim(),
                title: $('.char-title').text().trim(),
                description: $('.char-desc').text().trim(),
                skill: $('.skill-desc').text().trim(),
                type: 'character',
                id: id
            };
        } catch (err) {
            throw err;
        }
    }

    async function getPetDetail(id) {
        try {
            const { data } = await axios.get(`https://ff.garena.com/id/pets/${id}/`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const $ = cheerio.load(data);
            
            return {
                name: $('.pet-name').text().trim(),
                description: $('.pet-desc').text().trim(),
                skill: $('.skill-desc').text().trim(),
                type: 'pet',
                id: id
            };
        } catch (err) {
            throw err;
        }
    }

    app.get("/info/ffinfo", async (req, res) => {
        const { type, id } = req.query;

        if (!type || !id) {
            return res.status(400).json({ 
                status: false, 
                message: "Masukkan ?type= (character/pet) & ?id=" 
            });
        }

        try {
            let result;
            
            if (type === "character") {
                result = await getCharacterDetail(id);
            } else if (type === "pet") {
                result = await getPetDetail(id);
            } else {
                return res.status(400).json({ 
                    status: false, 
                    message: "Type tidak valid. Pilih: character atau pet" 
                });
            }

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