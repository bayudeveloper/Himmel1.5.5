const axios = require('axios');

module.exports = function(app) {
    app.get('/downloader/soundcloud/download', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' wajib diisi! Contoh: /downloader/soundcloud/download?url=https://soundcloud.com/..."
            });
        }

        if (!url.includes('soundcloud.com')) {
            return res.status(400).json({
                status: false,
                message: "URL harus dari SoundCloud"
            });
        }

        try {
            const response = await axios.post('https://cobalt.tools/api/json', {
                url: url,
                aFormat: 'mp3',
                isAudioOnly: true
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            const data = response.data;

            if (data.status === 'error') {
                return res.status(400).json({
                    status: false,
                    message: data.text || 'Gagal mendapatkan audio'
                });
            }

            if (data.status === 'stream' || data.status === 'redirect') {
                return res.json({
                    status: true,
                    url: url,
                    data: {
                        download_url: data.url,
                        type: 'audio'
                    }
                });
            }

            res.json({ status: true, url, data });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};
