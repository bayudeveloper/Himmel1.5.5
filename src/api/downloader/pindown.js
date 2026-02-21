const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {

    async function getPinterestVideo(url) {
        // Method 1: pinterestdownloader.io
        try {
            const res1 = await axios.post('https://www.pinterestdownloader.io/download',
                `url=${encodeURIComponent(url)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://www.pinterestdownloader.io/',
                        'Origin': 'https://www.pinterestdownloader.io'
                    },
                    timeout: 20000
                }
            );
            const $ = cheerio.load(res1.data);
            const links = [];
            $('a[href*="pinimg"], a[href*="pinterest"], a.download').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && href.startsWith('http')) {
                    links.push({ quality: text || `Link ${i+1}`, url: href });
                }
            });
            if (links.length > 0) return { status: true, source: 'pinterestdownloader', data: links };
        } catch (e) {}

        // Method 2: savepin.app
        try {
            const res2 = await axios.post('https://savepin.app/download.php',
                `url=${encodeURIComponent(url)}&lang=en`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://savepin.app/',
                        'Origin': 'https://savepin.app'
                    },
                    timeout: 20000
                }
            );
            const $ = cheerio.load(res2.data);
            const links = [];
            $('a.dl-btn, a[href*="pinimg"]').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && href.startsWith('http')) {
                    links.push({ quality: text || `Link ${i+1}`, url: href });
                }
            });
            if (links.length > 0) return { status: true, source: 'savepin', data: links };
        } catch (e) {}

        // Method 3: Ambil langsung dari Pinterest API
        try {
            // Resolve pin.it shortlink dulu kalau perlu
            let pinUrl = url;
            if (url.includes('pin.it')) {
                const redirect = await axios.get(url, { 
                    maxRedirects: 5,
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                pinUrl = redirect.request.res.responseUrl || url;
            }

            const res3 = await axios.get(pinUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html'
                },
                timeout: 15000
            });

            const $ = cheerio.load(res3.data);
            const links = [];

            // Cari video di meta tags
            $('meta[property="og:video"], meta[property="og:video:url"]').each((i, el) => {
                const content = $(el).attr('content');
                if (content) links.push({ quality: 'Video', url: content });
            });

            // Cari gambar di meta tags
            $('meta[property="og:image"]').each((i, el) => {
                const content = $(el).attr('content');
                if (content) links.push({ quality: 'Image', url: content });
            });

            if (links.length > 0) return { status: true, source: 'pinterest_direct', data: links };
        } catch (e) {}

        throw new Error('Semua method gagal. Pastikan URL Pinterest valid dan konten bisa diakses publik.');
    }

    app.get('/downloader/pindown', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, message: "Parameter 'url' wajib diisi" });
        if (!url.includes('pin.it') && !url.includes('pinterest.com')) {
            return res.status(400).json({ status: false, message: "URL harus dari Pinterest" });
        }
        try {
            const result = await getPinterestVideo(url);
            res.json(result);
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
