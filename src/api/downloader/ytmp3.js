const ytdl = require("ytdl-core");

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
            if (!ytdl.validateURL(url)) {
                return res.status(400).json({
                    status: false,
                    message: "URL YouTube tidak valid"
                });
            }

            const info = await ytdl.getInfo(url);
            const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
            
            res.json({
                status: true,
                data: {
                    title: info.videoDetails.title,
                    author: info.videoDetails.author.name,
                    duration: info.videoDetails.lengthSeconds,
                    thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
                    audio: format.url,
                    quality: format.audioBitrate + ' kbps'
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