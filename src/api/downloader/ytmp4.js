const ytdl = require('ytdl-core');

module.exports = function(app) {
    app.get("/downloader/ytmp4", async (req, res) => {
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

            // Pilih format video dengan audio
            const format = ytdl.chooseFormat(info.formats, { 
                quality: 'highestvideo',
                filter: 'audioandvideo'
            });

            res.json({
                status: true,
                data: {
                    title: info.videoDetails.title,
                    author: info.videoDetails.author.name,
                    duration: info.videoDetails.lengthSeconds,
                    thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
                    video_url: format.url,
                    quality: format.qualityLabel
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