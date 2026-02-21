const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = 3000;

/* ===========================
   EMOJI MIX SCRAPER
=========================== */
async function scrapeEmojiMix(emoji1, emoji2) {
  try {
    const url = `https://tikolu.net/emojimix/${encodeURIComponent(emoji1)}+${encodeURIComponent(emoji2)}`;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);

    let imageUrl = null;

    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && (src.includes("emojimix") || src.includes(".png"))) {
        imageUrl = src;
        return false;
      }
    });

    if (!imageUrl) {
      return { error: true, message: "Gambar tidak ditemukan" };
    }

    // Fix relative URL
    if (imageUrl.startsWith("//")) {
      imageUrl = "https:" + imageUrl;
    } else if (imageUrl.startsWith("/")) {
      imageUrl = "https://tikolu.net" + imageUrl;
    }

    return {
      error: false,
      pageUrl: url,
      imageUrl,
      emoji1,
      emoji2
    };

  } catch (err) {
    return {
      error: true,
      message: err.message
    };
  }
}

/* ===========================
   ENDPOINT
=========================== */
app.get("/emojimix", async (req, res) => {
  const { emoji1, emoji2 } = req.query;

  if (!emoji1 || !emoji2) {
    return res.status(400).json({
      status: false,
      message: "Masukkan parameter ?emoji1= & emoji2="
    });
  }

  const result = await scrapeEmojiMix(emoji1, emoji2);

  if (result.error) {
    return res.status(500).json({
      status: false,
      message: result.message
    });
  }

  res.json({
    status: true,
    source: "Tikolu EmojiMix",
    timestamp: new Date().toISOString(),
    data: result
  });
});

/* ===========================
   ROOT
=========================== */
app.get("/", (req, res) => {
  res.json({
    message: "EmojiMix API Ready 🚀",
    usage: "/emojimix?emoji1=😂&emoji2=🔥"
  });
});

/* ===========================
   START SERVER
=========================== */
app.listen(PORT, () => {
  console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});