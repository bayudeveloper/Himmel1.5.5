const express = require("express");
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = 3000;

/* ===========================
   CONFIG API (PAKE KEY LU)
=========================== */
const api = {
  url: "https://api.termai.cc",
  key: "TermAI-4ALwMabCh0KiN9I3"
};

/* ===========================
   MULTER (UPLOAD AUDIO)
=========================== */
const upload = multer({ dest: "uploads/" });

/* ===========================
   ROUTE REST API
=========================== */
app.post("/voice-cover", upload.single("audio"), async (req, res) => {
  try {
    const model = req.query.model || "Miku";

    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "Upload file audio pakai form-data field: audio"
      });
    }

    const audioData = fs.readFileSync(req.file.path);

    const response = await axios({
      method: "post",
      url: `${api.url}/api/audioProcessing/voice-covers`,
      params: {
        model,
        key: api.key
      },
      data: audioData,
      responseType: "stream", // WAJIB STREAM
      headers: {
        "Content-Type": "audio/mpeg"
      },
      timeout: 600000
    });

    let buffer = "";

    response.data.on("data", chunk => {
      buffer += chunk.toString();

      const lines = buffer.split("\n");

      for (let line of lines) {
        if (!line.startsWith("data:")) continue;

        const jsonStr = line.replace("data: ", "").trim();

        try {
          const data = JSON.parse(jsonStr);

          if (data.status === "success") {
            fs.unlinkSync(req.file.path);

            return res.json({
              status: true,
              model,
              result: data.result
            });
          }

          if (data.status === "failed") {
            fs.unlinkSync(req.file.path);

            return res.status(500).json(data);
          }

        } catch (e) {}
      }
    });

    response.data.on("error", err => {
      fs.unlinkSync(req.file.path);
      res.status(500).json({ status: false, error: err.message });
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Voice Cover API jalan di http://localhost:${PORT}`);
});