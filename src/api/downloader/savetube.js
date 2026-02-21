const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
    // Format yang tersedia
    const FORMATS = {
        video: ['144', '240', '360', '480', '720', '1080', '1440', '2160'],
        audio: ['mp3', 'm4a', 'webm', 'aac', 'flac', 'opus', 'ogg', 'wav']
    };

    // Fungsi untuk mendapatkan CDN
    async function getCDN() {
        try {
            const response = await axios.get('https://yt.savetube.me/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const $ = cheerio.load(response.data);
            
            // Cari CDN di script
            const scripts = $('script').map((i, el) => $(el).html()).get();
            let cdn = 'media.savetube.me';
            
            for (const script of scripts) {
                if (script && script.includes('cdn')) {
                    const match = script.match(/cdn["']?\s*:\s*["']([^"']+)/);
                    if (match) cdn = match[1];
                    break;
                }
            }
            
            return cdn;
        } catch (err) {
            return 'media.savetube.me';
        }
    }

    // Fungsi untuk mendapatkan info video
    async function getVideoInfo(videoId) {
        try {
            const cdn = await getCDN();
            
            const response = await axios.post(`https://${cdn}/api/info`, {
                url: `https://www.youtube.com/watch?v=${videoId}`
            }, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Content-Type': 'application/json',
                    'Origin': 'https://yt.savetube.me',
                    'Referer': 'https://yt.savetube.me/',
                    'Accept': 'application/json'
                }
            });

            return response.data;
        } catch (err) {
            throw new Error("Gagal mendapatkan info video");
        }
    }

    // Fungsi untuk download video
    async function downloadVideo(videoId, format, quality) {
        try {
            const cdn = await getCDN();
            
            // Tentukan tipe download
            const downloadType = FORMATS.audio.includes(format) ? 'audio' : 'video';
            
            // Tentukan quality
            let downloadQuality = quality;
            if (downloadType === 'audio') {
                downloadQuality = '128'; // default untuk audio
            }

            const response = await axios.post(`https://${cdn}/api/download`, {
                id: videoId,
                downloadType: downloadType,
                quality: downloadQuality
            }, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Content-Type': 'application/json',
                    'Origin': 'https://yt.savetube.me',
                    'Referer': 'https://yt.savetube.me/',
                    'Accept': 'application/json'
                }
            });

            return response.data;
        } catch (err) {
            throw new Error(`Gagal download ${format}`);
        }
    }

    // Endpoint utama
    app.get("/downloader/savetube", async (req, res) => {
        const { url, format = 'mp3', quality } = req.query;

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

            // Validasi format
            const allFormats = [...FORMATS.video, ...FORMATS.audio];
            if (!allFormats.includes(format)) {
                return res.status(400).json({
                    status: false,
                    message: "Format tidak tersedia",
                    available: FORMATS
                });
            }

            // Dapatkan info video
            const info = await getVideoInfo(videoId);
            
            // Parse data yang dienkripsi (kalau ada)
            let videoData = info;
            if (info.data) {
                try {
                    // Decode base64 jika perlu
                    const decoded = Buffer.from(info.data, 'base64').toString();
                    videoData = JSON.parse(decoded);
                } catch (e) {
                    videoData = info;
                }
            }

            // Dapatkan judul dari YouTube (fallback)
            let title = videoData.title || '';
            if (!title) {
                try {
                    const oembed = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                    title = oembed.data.title;
                } catch (e) {
                    title = `YouTube Video ${videoId}`;
                }
            }

            // Tentukan quality
            let finalQuality = quality;
            if (!finalQuality) {
                if (FORMATS.audio.includes(format)) {
                    finalQuality = '128kbps';
                } else {
                    finalQuality = format; // untuk video, quality = format (144, 240, dll)
                }
            }

            // Download video/audio
            const downloadResult = await downloadVideo(videoId, format, finalQuality);

            res.json({
                status: true,
                data: {
                    title: title,
                    videoId: videoId,
                    thumbnail: videoData.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    type: FORMATS.audio.includes(format) ? 'audio' : 'video',
                    format: format,
                    quality: finalQuality,
                    duration: videoData.duration || 0,
                    download_url: downloadResult.downloadUrl || downloadResult.url,
                    key: videoData.key || null
                }
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });

    // Endpoint untuk lihat formats
    app.get("/downloader/savetube/formats", (req, res) => {
        res.json({
            status: true,
            data: FORMATS
        });
    });

    // Endpoint untuk info saja
    app.get("/downloader/savetube/info", async (req, res) => {
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

            const info = await getVideoInfo(videoId);
            
            let videoData = info;
            if (info.data) {
                try {
                    const decoded = Buffer.from(info.data, 'base64').toString();
                    videoData = JSON.parse(decoded);
                } catch (e) {}
            }

            res.json({
                status: true,
                data: {
                    title: videoData.title || `YouTube Video ${videoId}`,
                    videoId: videoId,
                    thumbnail: videoData.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    duration: videoData.duration || 0,
                    key: videoData.key || null,
                    formats: FORMATS
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