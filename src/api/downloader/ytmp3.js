const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
    const BASE_URL = 'https://ssyoutube.com';

    async function scrapeYtmp3(videoId) {
        try {
            // Dapatkan halaman download
            const downloadUrl = `https://ssyoutube.com/watch?v=${videoId}`;
            
            const response = await axios.get(downloadUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Referer': 'https://www.youtube.com/'
                }
            });

            const $ = cheerio.load(response.data);
            
            // Extract title
            let title = $('h1').first().text().trim() || 
                       $('title').text().replace('Download', '').trim() ||
                       `YouTube Video ${videoId}`;

            // Cari link MP3
            let mp3Link = null;
            $('a[href*=".mp3"]').each((i, el) => {
                if (!mp3Link) {
                    const link = $(el).attr('href');
                    const quality = $(el).text().match(/\d+kbps/)?.[0] || '128kbps';
                    if (link && link.startsWith('http')) {
                        mp3Link = { url: link, quality: quality };
                    }
                }
            });

            return {
                title: title,
                videoId: videoId,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                format: 'mp3',
                quality: mp3Link?.quality || '128kbps',
                download_url: mp3Link?.url || downloadUrl
            };

        } catch (err) {
            throw new Error(`Gagal scrape MP3: ${err.message}`);
        }
    }

    app.get("/downloader/ytmp3", async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        try {
            const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^?&]+)/)?.[1];
            
            if (!videoId) {
                return res.status(400).json({
                    status: false,
                    message: "URL YouTube tidak valid"
                });
            }

            const result = await scrapeYtmp3(videoId);

            res.json({
                status: true,
                data: {
                    title: result.title,
                    videoId: result.videoId,
                    thumbnail: result.thumbnail,
                    format: result.format,
                    quality: result.quality,
                    download_url: result.download_url
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