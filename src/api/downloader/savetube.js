const axios = require("axios");
const crypto = require("crypto");

module.exports = function(app) {
    const API_URL = "https://api.savetube.me/v1";
    const CDN_URL = "https://cdn.savetube.me";

    async function getCDN() {
        try {
            const response = await axios.get(`${API_URL}/cdn`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Origin': 'https://yt.savetube.me'
                }
            });
            return response.data.cdn;
        } catch (err) {
            return "cdn.savetube.me";
        }
    }

    async function getVideoInfo(url) {
        try {
            const cdn = await getCDN();
            const response = await axios.post(`https://${cdn}/api/info`, {
                url: url
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0',
                    'Origin': 'https://yt.savetube.me'
                }
            });
            return response.data;
        } catch (err) {
            throw new Error("Gagal mendapatkan info video");
        }
    }

    async function downloadVideo(url, quality = 'mp3') {
        try {
            const cdn = await getCDN();
            const info = await getVideoInfo(url);
            
            const downloadType = quality === 'mp3' ? 'audio' : 'video';
            const qualityValue = quality === 'mp3' ? '128' : quality;

            const response = await axios.post(`https://${cdn}/api/download`, {
                url: url,
                type: downloadType,
                quality: qualityValue
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0',
                    'Origin': 'https://yt.savetube.me'
                }
            });

            return {
                title: info.title || "Unknown",
                duration: info.duration || 0,
                thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${info.videoId}/maxresdefault.jpg`,
                type: downloadType,
                quality: quality,
                download_url: response.data.downloadUrl || response.data.url
            };
        } catch (err) {
            throw new Error("Gagal download video");
        }
    }

    app.get("/downloader/savetube", async (req, res) => {
        const { url, format = 'mp3' } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        try {
            const result = await downloadVideo(url, format);
            res.json({
                status: true,
                data: result
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};