const express = require("express");
const axios = require("axios");
const fetch = require("node-fetch");
const { sizeFormatter } = require("human-readable");

const app = express();
const PORT = 3000;

/* ===========================
   FORMAT SIZE
=========================== */
const formatSize = sizeFormatter({
  std: "JEDEC",
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`
});

/* ===========================
   GDRIVE DOWNLOADER
=========================== */
async function GDriveDl(url) {
  let id, res = { error: true };

  if (!(url && url.match(/drive\.google/i))) return res;

  try {
    id = (url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//))[1];
    if (!id) throw "ID Not Found";

    const response = await axios(
      `https://drive.google.com/uc?id=${id}&authuser=0&export=download`,
      {
        method: "post",
        headers: {
          "accept-encoding": "gzip, deflate, br",
          "content-length": 0,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          origin: "https://drive.google.com",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "x-drive-first-party": "DriveWebUi",
          "x-json-requested": "true"
        }
      }
    );

    const { fileName, sizeBytes, downloadUrl } = JSON.parse(
      response.data.slice(4)
    );

    if (!downloadUrl) throw "Link Download Limit!";

    const data = await fetch(downloadUrl);

    if (data.status !== 200) {
      return { error: true, message: data.statusText };
    }

    return {
      error: false,
      fileName,
      fileSize: formatSize(sizeBytes),
      mimetype: data.headers.get("content-type"),
      downloadUrl
    };
  } catch (e) {
    return {
      error: true,
      message: e.toString()
    };
  }
}

/* ===========================
   ENDPOINT
=========================== */
app.get("/download/gdrive", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Masukkan parameter ?url="
    });
  }

  const result = await GDriveDl(url);

  if (result.error) {
    return res.status(500).json({
      status: false,
      message: result.message || "Gagal mengambil file"
    });
  }

  res.json({
    status: true,
    source: "Google Drive",
    timestamp: new Date().toISOString(),
    data: result
  });
});

/* ===========================
   ROOT
=========================== */
app.get("/", (req, res) => {
  res.json({
    message: "Google Drive Downloader API Ready 🚀",
    usage: "/download/gdrive?url=https://drive.google.com/file/d/FILE_ID/view"
  });
});

/* ===========================
   START SERVER
=========================== */
app.listen(PORT, () => {
  console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});