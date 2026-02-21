const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
    async function scrapeY2Mate(videoId, quality = '720') {
        try {
            // Step 1: Dapatkan halaman utama
            const mainPage = await axios.get('https://www.y2mate.com/id/youtube', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Step 2: Extract token
            const $ = cheerio.load(mainPage.data);
            const token = $('input[name="_token"]').val();

            // Step 3: Convert video
            const convertResponse = await axios.post('https://www.y2mate.com/mates/analyzeV2/ajax', 
                new URLSearchParams({
                    '_token': token,
                    'url': `https://www.youtube.com/watch?v=${videoId}`,
                    'ajax': '1'
                }), {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const convertData = convertResponse.data;
            
            // Step 4: Pilih kualitas video
            let qualityKey = 'mp4';
            if (convertData.links.mp4) {
                const qualities = Object.keys(convertData.links.mp4);
                if (qualities.includes(quality)) {
                    qualityKey = quality;
                } else {
                    qualityKey = qualities[0];
                }
            }

            // Step 5: Dapatkan link download
            const resultPage = await axios.post('https://www.y2mate.com/mates/convertV2/index', 
                new URLSearchParams({
                    '_token': token,
                    'vid': convertData.vid,
                    'k': convertData.links.mp4[qualityKey].k
                }), {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            return {
                title: convertData.title,
                videoId: videoId,
                quality: qualityKey,
                download_url: resultPage.data.dlink
            };
        } catch (err) {
            throw new Error("Gagal scrape dari y2mate");
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
            // Ekstrak video ID
            const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^?&]+)/)?.[1];
            
            if (!videoId) {
                return res.status(400).json({
                    status: false,
                    message: "URL YouTube tidak valid"
                });
            }

            // Scrape dari y2mate
            const result = await scrapeY2Mate(videoId, quality);

            res.json({
                status: true,
                data: {
                    title: result.title,
                    videoId: result.videoId,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    format: "mp4",
                    quality: result.quality + 'p',
                    download_url: result.download_url
                }
            });

        } catch (err) {
            // Fallback scraping dari savetube
            try {
                const savetubeRes = await axios.post('https://yt.savetube.me/api/download', {
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    format: 'video',
                    quality: quality
                }, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Origin': 'https://yt.savetube.me'
                    }
                });

                res.json({
                    status: true,
                    data: {
                        title: `YouTube Video ${videoId}`,
                        videoId: videoId,
                        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                        format: "mp4",
                        quality: quality + 'p',
                        download_url: savetubeRes.data.downloadUrl || savetubeRes.data.url
                    }
                });
            } catch (fallbackErr) {
                res.status(500).json({
                    status: false,
                    error: err.message
                });
            }
        }
    });
};