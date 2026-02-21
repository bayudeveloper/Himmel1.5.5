const axios = require("axios");

module.exports = function(app) {
    async function teraboxDownload(url) {
        try {
            const response = await axios.get(`https://terabox-dl.phiros.workers.dev/?url=${encodeURIComponent(url)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 30000
            });

            if (response.data && response.data.ok) {
                return {
                    filename: response.data.fileName,
                    size: response.data.size,
                    download: response.data.downloadLink
                };
            }
            throw new Error('Failed to get data');
        } catch (err) {
            throw err;
        }
    }

    app.get("/downloader/terabox", async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        try {
            const result = await teraboxDownload(url);
            
            res.json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};