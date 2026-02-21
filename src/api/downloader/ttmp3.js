const axios = require("axios");

module.exports = function(app) {
    async function tiktokDownload(url) {
        try {
            const response = await axios.post('https://www.tikwm.com/api/', {
                url: url,
                count: 12,
                cursor: 0,
                web: 1,
                hd: 1
            }, {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (response.data.code === 0) {
                const data = response.data.data;
                return {
                    title: data.title,
                    author: data.author.unique_id,
                    audio: data.music ? `https://www.tikwm.com${data.music}` : null,
                    cover: data.cover,
                    duration: data.duration,
                    stats: {
                        play: data.play_count,
                        like: data.digg_count,
                        comment: data.comment_count,
                        share: data.share_count
                    }
                };
            }
            throw new Error('Failed to get data');
        } catch (err) {
            throw err;
        }
    }

    app.get("/downloader/ttmp3", async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        try {
            const result = await tiktokDownload(url);
            
            res.json({
                status: true,
                data: result
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};