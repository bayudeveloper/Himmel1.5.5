const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

module.exports = function(app) {
    function apiRequest(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith("https") ? https : http;

            protocol.get(url, (res) => {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        resolve(data);
                    }
                });
            }).on("error", reject);
        });
    }

    function downloadFile(url, filepath) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith("https") ? https : http;
            const file = fs.createWriteStream(filepath);

            protocol.get(url, (response) => {

                if (response.statusCode === 301 || response.statusCode === 302) {
                    return downloadFile(response.headers.location, filepath)
                        .then(resolve)
                        .catch(reject);
                }

                response.pipe(file);

                file.on("finish", () => {
                    file.close();
                    resolve(filepath);
                });

            }).on("error", (err) => {
                fs.unlink(filepath, () => {});
                reject(err);
            });
        });
    }

    async function getTikWM(url) {
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        const response = await apiRequest(apiUrl);

        if (response.code !== 0 || !response.data) {
            throw new Error("Gagal ambil data TikWM");
        }

        const data = response.data;

        return {
            title: data.title,
            author: data.author?.unique_id,
            duration: data.duration,
            audio: `https://www.tikwm.com${data.music}`,
            cover: data.cover,
            stats: {
                likes: data.digg_count,
                comments: data.comment_count,
                shares: data.share_count,
                plays: data.play_count
            }
        };
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
            const data = await getTikWM(url);

            const filename = `${data.author}_${Date.now()}.mp3`;
            const downloadDir = path.join(__dirname, "../../../downloads");

            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }

            const filepath = path.join(downloadDir, filename);

            await downloadFile(data.audio, filepath);

            res.json({
                status: true,
                info: data,
                download: `/downloads/${filename}`
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};