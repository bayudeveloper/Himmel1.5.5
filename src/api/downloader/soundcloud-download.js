const axios = require('axios');

module.exports = function(app) {
    class SoundCloudDownload {
        constructor() {
            this.baseURL = 'https://m.joomods.web.id';
            this.headers = {
                'accept': '*/*',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'referer': 'https://m.joomods.web.id/',
                'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"',
                'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36'
            };
        }

        async download(url) {
            try {
                const response = await axios({
                    method: 'GET',
                    url: `${this.baseURL}/api/music`,
                    headers: this.headers,
                    params: {
                        download: url
                    },
                    timeout: 15000
                });

                return response.data;
            } catch (err) {
                return {
                    status: false,
                    message: err.message
                };
            }
        }
    }

    /**
     * ENDPOINT: /downloader/soundcloud/download?url=https://soundcloud.com/artist/track
     * Method: GET
     * Desc: Get download URL from SoundCloud track
     */
    app.get('/downloader/soundcloud/download', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' wajib diisi! Contoh: /downloader/soundcloud/download?url=https://soundcloud.com/artist/track"
            });
        }

        if (!url.includes('soundcloud.com')) {
            return res.status(400).json({
                status: false,
                message: "URL harus dari SoundCloud"
            });
        }

        try {
            const api = new SoundCloudDownload();
            const result = await api.download(url);

            if (!result.status) {
                return res.status(400).json({
                    status: false,
                    message: result.message || 'Gagal mendapatkan download URL'
                });
            }

            res.json({
                status: true,
                url: url,
                data: {
                    title: result.result?.title || 'Unknown',
                    duration: result.result?.duration || 'Unknown',
                    download_url: result.result?.download_url || null
                }
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};