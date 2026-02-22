const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {

    async function snapsave(url) {
        // Step 1: Ambil token dari halaman utama
        const pageRes = await axios.get('https://snapsave.app/id', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
            },
            timeout: 15000
        });

        const $page = cheerio.load(pageRes.data);

        // Ambil token dari hidden input
        const token = $page('input[name="token"]').val() ||
                      $page('input[name="_token"]').val() ||
                      $page('meta[name="csrf-token"]').attr('content') || '';

        // Ambil cookies dari response
        const cookies = pageRes.headers['set-cookie'];
        const cookieString = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

        // Step 2: POST URL ke action.php
        const formData = new URLSearchParams();
        formData.append('url', url);
        if (token) formData.append('token', token);

        const postRes = await axios.post('https://snapsave.app/action.php', formData.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://snapsave.app/id',
                'Origin': 'https://snapsave.app',
                'Accept': '*/*',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
                'Cookie': cookieString
            },
            timeout: 20000
        });

        const data = postRes.data;

        // Step 3: Parse HTML response
        const $ = cheerio.load(typeof data === 'string' ? data : JSON.stringify(data));

        const results = [];

        // Cari semua link download dari tabel
        $('tbody tr').each((i, el) => {
            const tds = $(el).find('td');
            const quality = $(tds[0]).text().trim();
            const type = $(tds[1]).text().trim();
            const a = $(tds[2]).find('a') || $(el).find('a');
            const dlUrl = a.attr('href');

            if (dlUrl && dlUrl.startsWith('http')) {
                results.push({
                    quality: quality || `Video ${i + 1}`,
                    type: type || 'video',
                    url: dlUrl
                });
            }
        });

        // Fallback: cari semua link <a> yang ada di response
        if (results.length === 0) {
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && href.startsWith('http') && (href.includes('fbcdn') || href.includes('facebook') || href.includes('snapsave'))) {
                    results.push({
                        quality: text || `Link ${i + 1}`,
                        type: 'video',
                        url: href
                    });
                }
            });
        }

        return results;
    }

    /**
     * ENDPOINT: /downloader/snapsave?url=FB_URL
     * Method: GET
     * Desc: Download Facebook videos via snapsave.app
     */
    app.get('/downloader/snapsave', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' wajib diisi! Contoh: /downloader/snapsave?url=https://www.facebook.com/..."
            });
        }

        if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
            return res.status(400).json({
                status: false,
                message: "URL harus dari Facebook (facebook.com atau fb.watch)"
            });
        }

        try {
            const results = await snapsave(url);

            if (!results || results.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Tidak ada video ditemukan. Pastikan URL valid dan video bersifat publik."
                });
            }

            res.json({
                status: true,
                url: url,
                total: results.length,
                data: results
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};
