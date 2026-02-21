const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
    async function scrapeY2Mate(videoId) {
        try {
            // Step 1: Dapatkan halaman utama
            const mainPage = await axios.get('https://www.y2mate.com/id/youtube-mp3', {
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
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': 'https://www.y2mate.com',
                    'Referer': 'https://www.y2mate.com/id/youtube-mp3'
                }
            });

            const convertData = convertResponse.data;
            
            // Step 4: Dapatkan link download MP3
            const resultPage = await axios.post('https://www.y2mate.com/mates/convertV2/index', 
                new URLSearchParams({
                    '_token': token,
                    'vid': convertData.vid,
                    'k': convertData.links.mp3.mp3128.k
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
                download_url: resultPage.data.dlink
            };
        } catch (err) {
            throw new Error("Gagal scrape dari y2mate");
        }
    }

    app.get("/downloader/ytmp3", async (req, res) => {
        const url = req.query.url;

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
            const result = await scrapeY2Mate(videoId);

            res.json({
                status: true,
                data: {
                    title: result.title,
                    videoId: result.videoId,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    format: "mp3",
                    quality: "128kbps",
                    download_url: result.download_url
                }
            });

        } catch (err) {
            // Fallback scraping dari savetube
            try {
                const savetubeRes = await axios.post('https://yt.savetube.me/api/download', {
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    format: 'mp3'
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
                        format: "mp3",
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