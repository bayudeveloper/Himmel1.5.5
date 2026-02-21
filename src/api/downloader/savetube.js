const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
    async function scrapeFromSSYouTube(url) {
        try {
            // Ekstrak video ID
            const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^?&]+)/)?.[1];
            
            // Method 1: Langsung akses dengan tambahan 'ss'
            const ssUrl = `https://ssyoutube.com/watch?v=${videoId}`;
            
            const response = await axios.get(ssUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.youtube.com/'
                }
            });

            const $ = cheerio.load(response.data);
            
            // Ambil judul dari meta
            let title = $('meta[property="og:title"]').attr('content') || 
                       $('title').text().replace('Download', '').trim() ||
                       `Video ${videoId}`;
            
            // Ambil thumbnail
            let thumbnail = $('meta[property="og:image"]').attr('content') || 
                           `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

            // Cari semua link download
            const formats = [];
            
            // Cari link video
            $('a[href*=".mp4"], a[href*="download"]').each((i, el) => {
                const link = $(el).attr('href');
                const text = $(el).text().toLowerCase();
                
                if (link && link.includes('http')) {
                    let quality = '720p';
                    if (text.includes('1080')) quality = '1080p';
                    else if (text.includes('720')) quality = '720p';
                    else if (text.includes('480')) quality = '480p';
                    else if (text.includes('360')) quality = '360p';
                    
                    formats.push({
                        type: 'video',
                        format: 'mp4',
                        quality: quality,
                        url: link
                    });
                }
            });

            // Cari link audio
            $('a[href*=".mp3"]').each((i, el) => {
                const link = $(el).attr('href');
                if (link && link.includes('http')) {
                    formats.push({
                        type: 'audio',
                        format: 'mp3',
                        quality: '128kbps',
                        url: link
                    });
                }
            });

            // Method 2: Coba ambil dari API mereka
            if (formats.length === 0) {
                const apiResponse = await axios.post('https://ssyoutube.com/api/convert', {
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    format: 'mp4'
                }, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (apiResponse.data && apiResponse.data.url) {
                    formats.push({
                        type: 'video',
                        format: 'mp4',
                        quality: '720p',
                        url: apiResponse.data.url
                    });
                }
            }

            return {
                title: title,
                videoId: videoId,
                thumbnail: thumbnail,
                formats: formats
            };

        } catch (err) {
            throw new Error(`Gagal scrape: ${err.message}`);
        }
    }

    app.get("/downloader/savetube", async (req, res) => {
        const { url, format = 'mp3' } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        try {
            const result = await scrapeFromSSYouTube(url);
            
            // Filter berdasarkan format
            let downloadUrl = null;
            let selectedFormat = null;
            
            if (format === 'mp3') {
                selectedFormat = result.formats.find(f => f.format === 'mp3');
            } else {
                selectedFormat = result.formats.find(f => f.format === 'mp4');
            }

            res.json({
                status: true,
                data: {
                    title: result.title,
                    videoId: result.videoId,
                    thumbnail: result.thumbnail,
                    format: format,
                    quality: selectedFormat?.quality || (format === 'mp3' ? '128kbps' : '720p'),
                    download_url: selectedFormat?.url || `https://ssyoutube.com/watch?v=${result.videoId}`,
                    all_formats: result.formats
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