const axios = require('axios');
const qs = require('qs');

module.exports = function(app) {
    class FBDown {
        constructor() {
            this.baseURL = 'https://y2date.com';
            this.headers = {
                'accept': '*/*',
                'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'origin': 'https://y2date.com',
                'referer': 'https://y2date.com/facebook-video-downloader/',
                'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                'content-type': 'application/x-www-form-urlencoded'
            };
            this.token = '3ecace38ab99d0aa20f9560f0c9703787d4957d34d2a2d42bfe5b447f397e03c';
        }

        async getVideo(url) {
            try {
                const payload = qs.stringify({
                    url: url,
                    token: this.token
                });

                const response = await axios.post(`${this.baseURL}/wp-json/aio-dl/video-data/`, payload, {
                    headers: this.headers,
                    timeout: 30000
                });

                return response.data;
            } catch (err) {
                return {
                    success: false,
                    message: err.message
                };
            }
        }
    }

    /**
     * ENDPOINT: /downloader/facebook?url=FB_VIDEO_URL
     * Method: GET
     * Desc: Download Facebook videos via y2date.com
     */
    app.get('/downloader/facebook', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' wajib diisi! Contoh: /downloader/facebook?url=https://www.facebook.com/share/r/18Kd6fLeWP/"
            });
        }

        // Validasi URL Facebook
        if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
            return res.status(400).json({
                status: false,
                message: "URL harus dari Facebook (facebook.com atau fb.watch)"
            });
        }

        try {
            const api = new FBDown();
            const result = await api.getVideo(url);

            if (!result || !result.success) {
                return res.status(400).json({
                    status: false,
                    message: result?.message || 'Gagal mendapatkan video'
                });
            }

            // Format response sesuai dengan struktur asli
            const response = {
                status: true,
                url: url,
                data: {
                    title: result.title || 'Facebook Video',
                    thumbnail: result.thumbnail || null,
                    duration: result.duration || null
                },
                formats: []
            };

            // Ambil semua format video yang tersedia
            if (result.medias && Array.isArray(result.medias)) {
                response.formats = result.medias.map(media => ({
                    quality: media.quality || 'Unknown',
                    url: media.url || null,
                    size: media.size || null
                }));
            }

            // Ambil format audio jika ada
            if (result.audios && Array.isArray(result.audios)) {
                response.audio = result.audios.map(audio => ({
                    quality: audio.quality || 'Unknown',
                    url: audio.url || null,
                    size: audio.size || null
                }));
            }

            res.json(response);

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};