const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {

    async function searchSoundCloud(query) {
        // Method 1: SoundCloud official search page scrape
        try {
            const res1 = await axios.get(`https://soundcloud.com/search/sounds`, {
                params: { q: query },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml'
                },
                timeout: 15000
            });

            // Cari data dari window.__sc_hydration
            const match = res1.data.match(/window\.__sc_hydration\s*=\s*(\[.+?\]);<\/script>/s);
            if (match) {
                const hydration = JSON.parse(match[1]);
                const collection = hydration.find(h => h.hydratable === 'sounds');
                if (collection && collection.data && collection.data.collection) {
                    const tracks = collection.data.collection.slice(0, 10);
                    return {
                        status: true,
                        source: 'soundcloud_scrape',
                        query,
                        total: tracks.length,
                        data: tracks.map(t => ({
                            title: t.title,
                            artist: t.user?.username || 'Unknown',
                            url: t.permalink_url,
                            duration: t.duration,
                            thumbnail: t.artwork_url || null,
                            plays: t.playback_count || 0
                        }))
                    };
                }
            }
        } catch (e) {}

        // Method 2: SoundCloud API v2 dengan multiple client_id
        const clientIds = [
            'a3e059563d7fd3372b49b37f00a00bcf',
            'iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX',
            '2t9loNQH90kzJcsFCODdigxfp325aq4z',
            'YUKXoArFcqrlQn9tfNHvvyfnDISj04zk'
        ];

        for (const clientId of clientIds) {
            try {
                const res2 = await axios.get('https://api-v2.soundcloud.com/search/tracks', {
                    params: { q: query, limit: 10, client_id: clientId },
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 10000
                });
                if (res2.data && res2.data.collection && res2.data.collection.length > 0) {
                    return {
                        status: true,
                        source: 'soundcloud_api',
                        query,
                        total: res2.data.collection.length,
                        data: res2.data.collection.map(t => ({
                            title: t.title,
                            artist: t.user?.username || 'Unknown',
                            url: t.permalink_url,
                            duration: t.duration,
                            thumbnail: t.artwork_url || null,
                            plays: t.playback_count || 0
                        }))
                    };
                }
            } catch (e) {}
        }

        // Method 3: Cari via SoundCloud widget oEmbed
        try {
            const searchUrl = `https://soundcloud.com/search?q=${encodeURIComponent(query)}`;
            const res3 = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                    'Accept': 'text/html'
                },
                timeout: 15000
            });
            const $ = cheerio.load(res3.data);
            const results = [];
            $('h2 a[href*="/"]').each((i, el) => {
                if (i >= 10) return false;
                const href = $(el).attr('href');
                const title = $(el).text().trim();
                if (href && title && href.split('/').length === 3) {
                    results.push({
                        title,
                        url: `https://soundcloud.com${href}`,
                        artist: href.split('/')[1] || 'Unknown'
                    });
                }
            });
            if (results.length > 0) {
                return { status: true, source: 'soundcloud_html', query, total: results.length, data: results };
            }
        } catch (e) {}

        throw new Error('Gagal mencari di SoundCloud. Coba lagi nanti.');
    }

    app.get('/downloader/soundcloud/search', async (req, res) => {
        const { q } = req.query;
        if (!q) return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi" });
        try {
            const result = await searchSoundCloud(q);
            res.json(result);
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
