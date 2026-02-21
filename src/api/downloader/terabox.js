const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

/* ===========================
   HEADER
=========================== */
const headers = {
  authority: "api.sylica.eu.org",
  origin: "https://www.kauruka.com",
  referer: "https://www.kauruka.com/",
  "user-agent": "Postify/1.0.0"
};

/* ===========================
   EXTRACT ID
=========================== */
function extractId(link) {
  const match = link.match(/s\/([a-zA-Z0-9]+)$|surl=([a-zA-Z0-9]+)$/);
  return match ? (match[1] || match[2]) : null;
}

/* ===========================
   FORMAT RESPONSE
=========================== */
function formatResponse(data, includeDL = false) {
  const result = {
    filename: data.filename,
    size: data.size,
    shareid: data.shareid,
    uk: data.uk,
    sign: data.sign,
    timestamp: data.timestamp,
    createTime: data.create_time,
    fsId: data.fs_id,
    message: data.message || "Tidak ada pesan"
  };

  if (includeDL) {
    result.dlink = data.downloadLink;
  }

  return result;
}

/* ===========================
   TERABOX ENDPOINT
=========================== */
app.get("/terabox", async (req, res) => {
  const link = req.query.url;
  const wantDownload = req.query.download === "1";

  if (!link) {
    return res.status(400).json({
      status: false,
      message: "Masukkan parameter ?url="
    });
  }

  const id = extractId(link);
  if (!id) {
    return res.status(400).json({
      status: false,
      message: "Link Terabox tidak valid"
    });
  }

  try {
    const apiUrl = `https://api.sylica.eu.org/terabox/?id=${id}${wantDownload ? "&download=1" : ""}`;

    const { data } = await axios.get(apiUrl, { headers });

    res.json({
      status: true,
      download: wantDownload,
      result: formatResponse(data.data, wantDownload)
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      error: error.response?.data || error.message
    });
  }
});

/* ===========================
   START SERVER
=========================== */
app.listen(PORT, () => {
  console.log(`🚀 Terabox API jalan di http://localhost:${PORT}`);
});