const axios = require('axios');

module.exports = function(app) {
    app.get('/downloader/facebook', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' wajib diisi! Contoh: /downloader/facebook?url=https://www.facebook.com/..."
            });
        }

        if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
            return res.status(400).json({
                status: false,
                message: "URL harus dari Facebook (facebook.com atau fb.watch)"
            });
        }

        try {
            const response = await axios.post('https://cobalt.tools/api/json', {
                url: url,
                vCodec: 'h264',
                vQuality: '720',
                aFormat: 'mp3',
                isNoTTWatermark: true
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
                    message: data.text || 'Gagal mendapatkan video'
                });
            }

            if (data.status === 'stream' || data.status === 'redirect') {
                return res.json({
                    status: true,
                    url: url,
                    data: {
                        download_url: data.url,
                        type: 'video'
                    }
                });
            }

            if (data.status === 'picker') {
                return res.json({
                    status: true,
                    url: url,
                    data: data.picker.map(item => ({
                        type: item.type,
                        download_url: item.url,
                        thumb: item.thumb || null
                    }))
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
