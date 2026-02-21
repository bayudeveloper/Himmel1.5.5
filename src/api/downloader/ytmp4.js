const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
    app.get("/downloader/ytmp4", async (req, res) => {
        const { url, quality = '720' } = req.query;

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
            
            // Cari semua link video
            const videoLinks = [];
            $('a[href*=".mp4"]').each((i, el) => {
                const link = $(el).attr('href');
                const text = $(el).text().toLowerCase();
                
                if (link && link.includes('http')) {
                    let vidQuality = '720p';
                    if (text.includes('1080')) vidQuality = '1080p';
                    else if (text.includes('720')) vidQuality = '720p';
                    else if (text.includes('480')) vidQuality = '480p';
                    
                    videoLinks.push({
                        quality: vidQuality,
                        url: link
                    });
                }
            });

            // Pilih sesuai quality yang diminta
            let selectedVideo = videoLinks.find(v => v.quality.includes(quality));
            if (!selectedVideo && videoLinks.length > 0) {
                selectedVideo = videoLinks[0];
            }

            // Kalo ga nemu, coba dari API
            if (!selectedVideo) {
                const apiResponse = await axios.post('https://ssyoutube.com/api/convert', {
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    format: 'mp4',
                    quality: quality
                }, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Content-Type': 'application/json'
                    }
                });

                if (apiResponse.data && apiResponse.data.url) {
                    selectedVideo = {
                        quality: quality + 'p',
                        url: apiResponse.data.url
                    };
                }
            }

            res.json({
                status: true,
                data: {
                    title: title || `YouTube Video ${videoId}`,
                    videoId: videoId,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    format: 'mp4',
                    quality: selectedVideo?.quality || quality + 'p',
                    download_url: selectedVideo?.url || ssUrl,
                    available_qualities: videoLinks.map(v => v.quality)
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