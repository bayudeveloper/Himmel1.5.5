const axios = require("axios");

module.exports = function(app) {
    const formatVideo = ['144', '240', '360', '480', '720', '1080'];
    const formatAudio = ['mp3', 'm4a', 'webm', 'aac'];

    function extractYoutubeId(url) {
        const patterns = [
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
        ];
        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    app.get("/downloader/savetube", async (req, res) => {
        const { url, format = 'mp3' } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        const videoId = extractYoutubeId(url);
        if (!videoId) {
            return res.status(400).json({
                status: false,
                message: "Link YouTube tidak valid"
            });
        }

        const isAudio = formatAudio.includes(format);
        const isVideo = formatVideo.includes(format);

        if (!isAudio && !isVideo) {
            return res.status(400).json({
                status: false,
                message: "Format tidak didukung",
                available: { video: formatVideo, audio: formatAudio }
            });
        }

        try {
            // Mock response for now
            res.json({
                status: true,
                result: {
                    title: "YouTube Video",
                    id: videoId,
                    type: isAudio ? 'audio' : 'video',
                    format: format,
                    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
                    download: `https://www.youtube.com/watch?v=${videoId}`,
                    note: "This is a mock response. Actual download would be implemented here."
                }
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });

    app.get("/downloader/savetube/formats", (req, res) => {
        res.json({
            status: true,
            video: formatVideo,
            audio: formatAudio
        });
    });
};