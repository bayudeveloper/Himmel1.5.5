const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
    app.get("/downloader/ytmp3", async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        try {
            // Ekstrak video ID
            const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^?&]+)/)?.[1];
            
            // Method: Tambah 'ss' di depan youtube
            const ssUrl = `https://ssyoutube.com/watch?v=${videoId}`;
            
            const response = await axios.get(ssUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });

            const $ = cheerio.load(response.data);
            
            // Ambil judul
            const title = $('meta[property="og:title"]').attr('content') || 
                         $('title').text().replace('Download', '').trim();
            
            // Cari link MP3
            let mp3Url = null;
            $('a[href*=".mp3"]').each((i, el) => {
                const link = $(el).attr('href');
                if (link && link.includes('http') && !mp3Url) {
                    mp3Url = link;
                }
            });

            // Kalo ga nemu, coba dari API
            if (!mp3Url) {
                const apiResponse = await axios.post('https://ssyoutube.com/api/convert', {
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    format: 'mp3'
                }, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Content-Type': 'application/json'
                    }
                });

                if (apiResponse.data && apiResponse.data.url) {
                    mp3Url = apiResponse.data.url;
                }
            }

            res.json({
                status: true,
                data: {
                    title: title || `YouTube Video ${videoId}`,
                    videoId: videoId,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    format: 'mp3',
                    quality: '128kbps',
                    download_url: mp3Url || ssUrl
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