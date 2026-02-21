const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
    const BASE_URL = 'https://ssyoutube.com';

    async function scrapeSavetube(videoId, format = 'mp3', quality = null) {
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

            // Cari semua link download
            const downloadLinks = [];
            
            $('a[href*=".mp3"]').each((i, el) => {
                const link = $(el).attr('href');
                const q = $(el).text().match(/\d+kbps/)?.[0] || '128kbps';
                if (link && link.startsWith('http')) {
                    downloadLinks.push({ format: 'mp3', quality: q, url: link });
                }
            });

            $('a[href*=".mp4"]').each((i, el) => {
                const link = $(el).attr('href');
                const q = $(el).text().match(/\d+p/)?.[0] || '720p';
                if (link && link.startsWith('http')) {
                    downloadLinks.push({ format: 'mp4', quality: q, url: link });
                }
            });

            // Filter berdasarkan format
            let selectedLink = null;
            if (format === 'mp3') {
                selectedLink = downloadLinks.find(l => l.format === 'mp3');
            } else {
                if (quality) {
                    selectedLink = downloadLinks.find(l => l.format === 'mp4' && l.quality.includes(quality));
                }
                if (!selectedLink) {
                    selectedLink = downloadLinks.find(l => l.format === 'mp4');
                }
            }

            return {
                title: title,
                videoId: videoId,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                format: format,
                quality: selectedLink?.quality || (format === 'mp3' ? '128kbps' : '720p'),
                download_url: selectedLink?.url || downloadUrl
            };

        } catch (err) {
            throw new Error(`Gagal scrape dari SSYouTube: ${err.message}`);
        }
    }

    app.get("/downloader/savetube", async (req, res) => {
        const { url, format = 'mp3', quality } = req.query;

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

            const result = await scrapeSavetube(videoId, format, quality);

            res.json({
                status: true,
                data: {
                    title: result.title,
                    videoId: result.videoId,
                    thumbnail: result.thumbnail,
                    type: format === 'mp3' ? 'audio' : 'video',
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