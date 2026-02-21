const ytdl = require('ytdl-core');

module.exports = function(app) {
    app.get("/downloader/ytmp3", async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        try {
            // Validasi URL
            if (!ytdl.validateURL(url)) {
                return res.status(400).json({
                    status: false,
                    message: "URL YouTube tidak valid"
                });
            }

            // Dapatkan info video
            const info = await ytdl.getInfo(url, {
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                }
            });

            // Pilih format audio terbaik
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
            const bestAudio = audioFormats[0];

            res.json({
                status: true,
                data: {
                    title: info.videoDetails.title,
                    author: info.videoDetails.author.name,
                    duration: info.videoDetails.lengthSeconds,
                    thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
                    audio_url: bestAudio.url,
                    bitrate: bestAudio.audioBitrate,
                    quality: 'highest'
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