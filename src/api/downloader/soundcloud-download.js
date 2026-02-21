const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {

    async function getSoundCloudClientId() {
        try {
            const res = await axios.get('https://soundcloud.com', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                timeout: 15000
            });
            const $ = cheerio.load(res.data);
            let clientId = null;
            $('script[src]').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.includes('sndcdn.com') && !clientId) {
                    // parse dari script JS
                }
            });
            // Cari client_id dari script content
            const scripts = res.data.match(/client_id=([a-zA-Z0-9]+)/);
            if (scripts) clientId = scripts[1];
            return clientId;
        } catch (e) {
            return null;
        }
    }

    async function downloadSoundCloud(url) {
        // Method 1: soundcloudmp3.org
        try {
            const res1 = await axios.get('https://soundcloudmp3.org/api/track', {
                params: { url },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://soundcloudmp3.org/'
                },
                timeout: 20000
            });
            if (res1.data && res1.data.download_url) {
                return {
                    status: true,
                    source: 'soundcloudmp3',
                    data: {
                        title: res1.data.title || 'Unknown',
                        artist: res1.data.artist || 'Unknown',
                        thumbnail: res1.data.thumbnail || null,
                        duration: res1.data.duration || null,
                        download_url: res1.data.download_url
                    }
                };
            }
        } catch (e) {}

        // Method 2: scdownloader.net
        try {
            const res2 = await axios.post('https://scdownloader.net/api/download',
                { url },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://scdownloader.net/',
                        'Origin': 'https://scdownloader.net'
                    },
                    timeout: 20000
                }
            );
            if (res2.data && (res2.data.download || res2.data.url)) {
                return {
                    status: true,
                    source: 'scdownloader',
                    data: {
                        title: res2.data.title || 'Unknown',
                        thumbnail: res2.data.thumbnail || null,
                        download_url: res2.data.download || res2.data.url
                    }
                };
            }
        } catch (e) {}

        // Method 3: Ambil langsung dari SoundCloud page
        try {
            const res3 = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });
            const $ = cheerio.load(res3.data);
            const title = $('meta[property="og:title"]').attr('content') || 'Unknown';
            const thumbnail = $('meta[property="og:image"]').attr('content') || null;
            const streamUrl = $('meta[property="og:audio"]').attr('content') || null;

            if (streamUrl) {
                return {
                    status: true,
                    source: 'soundcloud_direct',
                    data: { title, thumbnail, download_url: streamUrl }
                };
            }
        } catch (e) {}

        throw new Error('Gagal mengambil audio. Pastikan URL SoundCloud valid dan track bisa diakses publik.');
    }

    app.get('/downloader/soundcloud/download', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, message: "Parameter 'url' wajib diisi" });
        if (!url.includes('soundcloud.com')) {
            return res.status(400).json({ status: false, message: "URL harus dari SoundCloud" });
        }
        try {
            const result = await downloadSoundCloud(url);
            res.json(result);
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
