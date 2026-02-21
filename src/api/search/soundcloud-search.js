const axios = require('axios');

module.exports = function(app) {
    class SoundCloudSearch {
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

        async search(query) {
            try {
                const response = await axios({
                    method: 'GET',
                    url: `${this.baseURL}/api/music`,
                    headers: this.headers,
                    params: {
                        alicia: query
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
     * ENDPOINT: /downloader/soundcloud/search?q=tabola%20bale
     * Method: GET
     * Desc: Search SoundCloud tracks
     */
    app.get('/downloader/soundcloud/search', async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'q' wajib diisi! Contoh: /downloader/soundcloud/search?q=tabola bale"
            });
        }

        try {
            const api = new SoundCloudSearch();
            const result = await api.search(q);

            if (!result.status) {
                return res.status(400).json({
                    status: false,
                    message: result.message || 'Gagal mencari musik'
                });
            }

            if (!result.result || result.result.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: `Tidak ada hasil untuk "${q}"`
                });
            }

            res.json({
                status: true,
                query: q,
                total: result.result.length,
                data: result.result.map(item => ({
                    title: item.title,
                    url: item.url,
                    duration: item.duration || 'Unknown',
                    thumbnail: item.thumbnail || null
                }))
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};