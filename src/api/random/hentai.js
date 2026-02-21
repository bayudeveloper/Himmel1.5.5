const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = 3004;

app.get("/search/hentai", async (req, res) => {
  try {
    const page = Math.floor(Math.random() * 1153);

    const response = await axios.get(`https://sfmcompile.club/page/${page}`, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const $ = cheerio.load(response.data);
    const hasil = [];

    $("#primary > div > div > ul > li > article").each((i, el) => {
      hasil.push({
        title: $(el).find("header > h2").text().trim(),
        link: $(el).find("header > h2 > a").attr("href"),
        category: $(el)
          .find("header > div.entry-before-title > span > span")
          .text()
          .replace("in ", "")
          .trim(),
        share_count: $(el)
          .find("header > div.entry-after-title > p > span.entry-shares")
          .text()
          .trim(),
        views_count: $(el)
          .find("header > div.entry-after-title > p > span.entry-views")
          .text()
          .trim(),
        type: $(el).find("source").attr("type") || "image/jpeg",
        media:
          $(el).find("source").attr("src") ||
          $(el).find("img").attr("data-src"),
      });
    });

    res.json({
      status: true,
      page,
      total: hasil.length,
      data: hasil,
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Gagal mengambil data",
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 API jalan di http://localhost:${PORT}`);
});