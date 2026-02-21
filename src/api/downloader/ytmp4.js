const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
    const BASE_URL = 'https://ssyoutube.com';

    async function scrapeYtmp4(videoId, quality = '720') {
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

            // Cari link MP4
            const mp4Links = [];
            $('a[href*=".mp4"]').each((i, el) => {
                const link = $(el).attr('href');
                const q = $(el).text().match(/\d+p/)?.[0] || '720p';
                if (link && link.startsWith('http')) {
                    mp4Links.push({ url: link, quality: q });
                }
            });

            // Pilih sesuai quality
            let selectedLink = mp4Links.find(l => l.quality.includes(quality));
            if (!selectedLink && mp4Links.length > 0) {
                selectedLink = mp4Links[0];
            }

            return {
                title: title,
                videoId: videoId,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                format: 'mp4',
                quality: selectedLink?.quality || quality + 'p',
                download_url: selectedLink?.url || downloadUrl,
                available_qualities: mp4Links.map(l => l.quality)
            };

        } catch (err) {
            throw new Error(`Gagal scrape MP4: ${err.message}`);
        }
    }

    app.get("/downloader/ytmp4", async (req, res) => {
        const { url, quality = '720' } = req.query;

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

            const result = await scrapeYtmp4(videoId, quality);

            res.json({
                status: true,
                data: {
                    title: result.title,
                    videoId: result.videoId,
                    thumbnail: result.thumbnail,
                    format: result.format,
                    quality: result.quality,
                    download_url: result.download_url,
                    available_qualities: result.available_qualities
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