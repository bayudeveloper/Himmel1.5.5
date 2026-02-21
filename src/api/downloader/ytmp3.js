const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");

module.exports = function(app) {
    app.get("/downloader/ytmp3", async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        if (!ytdl.validateURL(url)) {
            return res.status(400).json({
                status: false,
                message: "URL tidak valid"
            });
        }

        try {
            const info = await ytdl.getInfo(url);

            const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
            const filename = `${title}.mp3`;
            const downloadDir = path.join(__dirname, "../../../downloads");
            
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }
            
            const filepath = path.join(downloadDir, filename);

            const metadata = {
                title: info.videoDetails.title,
                author: info.videoDetails.author.name,
                duration: info.videoDetails.lengthSeconds,
                views: info.videoDetails.viewCount,
                thumbnail: info.videoDetails.thumbnails.pop().url
            };

            ytdl(url, { filter: "audioonly", quality: "highestaudio" })
                .pipe(fs.createWriteStream(filepath))
                .on("finish", () => {
                    res.json({
                        status: true,
                        info: metadata,
                        download: `/downloads/${filename}`
                    });
                });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};