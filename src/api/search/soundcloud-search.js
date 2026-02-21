const axios = require('axios');

module.exports = function(app) {
    app.get('/downloader/soundcloud/search', async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'q' wajib diisi! Contoh: /downloader/soundcloud/search?q=nama+lagu"
            });
        }

        try {
            // Pakai SoundCloud API publik via scraping
            const response = await axios.get('https://api-v2.soundcloud.com/search/tracks', {
                params: {
                    q: q,
                    limit: 10,
                    offset: 0,
                    linked_partitioning: 1,
                    client_id: 'a3e059563d7fd3372b49b37f00a00bcf' // public client_id
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            const tracks = response.data.collection;

            if (!tracks || tracks.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: `Tidak ada hasil untuk "${q}"`
                });
            }

            res.json({
                status: true,
                query: q,
                total: tracks.length,
                data: tracks.map(track => ({
                    title: track.title,
                    artist: track.user?.username || 'Unknown',
                    url: track.permalink_url,
                    duration: track.duration,
                    thumbnail: track.artwork_url || null,
                    plays: track.playback_count || 0
                }))
            });

        } catch (err) {
            // Fallback jika client_id expired
            res.status(500).json({
                status: false,
                error: 'SoundCloud API error: ' + err.message
            });
        }
    });
};
