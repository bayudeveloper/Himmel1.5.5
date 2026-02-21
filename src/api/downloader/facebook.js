const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {

    async function getFbVideo(url) {
        // Method 1: getfvid.com
        try {
            const res1 = await axios.post('https://getfvid.com/downloader', 
                `url=${encodeURIComponent(url)}&submit=`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://getfvid.com/',
                        'Origin': 'https://getfvid.com'
                    },
                    timeout: 20000
                }
            );
            const $ = cheerio.load(res1.data);
            const links = [];
            $('a.btn-success, a[href*="fbcdn"], a[href*="facebook"], a.download-btn').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && href.startsWith('http')) {
                    links.push({ quality: text || `Link ${i+1}`, url: href });
                }
            });
            if (links.length > 0) return { status: true, source: 'getfvid', data: links };
        } catch (e) {}

        // Method 2: snapsave.app
        try {
            const res2 = await axios.post('https://snapsave.app/action.php',
                `url=${encodeURIComponent(url)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://snapsave.app/',
                        'Origin': 'https://snapsave.app'
                    },
                    timeout: 20000
                }
            );
            const $ = cheerio.load(res2.data);
            const links = [];
            $('table tbody tr').each((i, el) => {
                const a = $(el).find('a');
                const quality = $(el).find('td').first().text().trim();
                const href = a.attr('href');
                if (href && href.startsWith('http')) {
                    links.push({ quality: quality || `Video ${i+1}`, url: href });
                }
            });
            if (links.length > 0) return { status: true, source: 'snapsave', data: links };
        } catch (e) {}

        // Method 3: fdown.net
        try {
            const res3 = await axios.post('https://fdown.net/download.php',
                `URLz=${encodeURIComponent(url)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://fdown.net/',
                        'Origin': 'https://fdown.net'
                    },
                    timeout: 20000
                }
            );
            const $ = cheerio.load(res3.data);
            const links = [];
            $('a#hdlink, a#sdlink').each((i, el) => {
                const href = $(el).attr('href');
                const id = $(el).attr('id');
                if (href && href.startsWith('http')) {
                    links.push({ quality: id === 'hdlink' ? 'HD' : 'SD', url: href });
                }
            });
            if (links.length > 0) return { status: true, source: 'fdown', data: links };
        } catch (e) {}

        throw new Error('Semua method gagal. Pastikan URL Facebook valid dan video bisa diakses publik.');
    }

    app.get('/downloader/facebook', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, message: "Parameter 'url' wajib diisi" });
        if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
            return res.status(400).json({ status: false, message: "URL harus dari Facebook" });
        }
        try {
            const result = await getFbVideo(url);
            res.json(result);
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
