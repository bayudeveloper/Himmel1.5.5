const axios = require('axios');
const { sizeFormatter } = require('human-readable');

module.exports = function(app) {
    const formatSize = sizeFormatter({
        std: "JEDEC",
        decimalPlaces: 2,
        keepTrailingZeroes: false,
        render: (literal, symbol) => `${literal} ${symbol}B`
    });

    async function GDriveDl(url) {
        try {
            if (!url || !url.match(/drive\.google/i)) {
                return { error: true, message: "Invalid Google Drive URL" };
            }

            const id = (url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//))?.[1];
            if (!id) return { error: true, message: "ID Not Found" };

            const response = await axios({
                method: "post",
                url: `https://drive.google.com/uc?id=${id}&authuser=0&export=download`,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                },
                timeout: 15000
            });

            let data;
            try {
                data = JSON.parse(response.data.slice(4));
            } catch {
                return { error: true, message: "Failed to parse response" };
            }

            if (!data.downloadUrl) {
                return { error: true, message: "Download link limit or not available" };
            }

            return {
                error: false,
                fileName: data.fileName || "Unknown",
                fileSize: formatSize(data.sizeBytes || 0),
                downloadUrl: data.downloadUrl
            };
            
        } catch (e) {
            return {
                error: true,
                message: e.message
            };
        }
    }

    app.get("/downloader/drive", async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        const result = await GDriveDl(url);

        if (result.error) {
            return res.status(500).json({
                status: false,
                message: result.message || "Gagal mengambil file"
            });
        }

        res.json({
            status: true,
            data: result
        });
    });
};