const axios = require("axios");

module.exports = function(app) {
    function extractId(link) {
        const match = link.match(/s\/([a-zA-Z0-9]+)$|surl=([a-zA-Z0-9]+)$/);
        return match ? (match[1] || match[2]) : null;
    }

    app.get("/downloader/terabox", async (req, res) => {
        const link = req.query.url;

        if (!link) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        const id = extractId(link);
        if (!id) {
            return res.status(400).json({
                status: false,
                message: "Link Terabox tidak valid"
            });
        }

        try {
            // Mock response
            res.json({
                status: true,
                data: {
                    filename: "file_name.mp4",
                    size: "10 MB",
                    id: id,
                    download: `https://terabox.com/file/${id}`,
                    note: "This is a mock response"
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};