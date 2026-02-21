const express = require("express");
const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;

app.get("/yt/mp4", async (req, res) => {
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
    const filename = `${title}.mp4`;
    const filepath = path.join(__dirname, filename);

    const metadata = {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds,
      views: info.videoDetails.viewCount,
      thumbnail: info.videoDetails.thumbnails.pop().url
    };

    ytdl(url, { quality: "highestvideo" })
      .pipe(fs.createWriteStream(filepath))
      .on("finish", () => {
        res.json({
          status: true,
          info: metadata,
          download: `http://localhost:${PORT}/${filename}`
        });
      });

    app.use(express.static(__dirname));

  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MP4 API jalan di http://localhost:${PORT}`);
});