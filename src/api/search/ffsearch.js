const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = 3001;

app.get("/ffsearch", async (req, res) => {
  const { type } = req.query;

  if (!type)
    return res.json({ status: false, message: "Masukkan ?type=" });

  try {
    let hasil = [];

    if (type === "characters") {
      const response = await axios.get("https://ff.garena.com/id/chars/");
      const $ = cheerio.load(response.data);

      $(".char-box.char-box-new").each((i, el) => {
        let name = $(el).find(".char-item-name").text();
        let desc = $(el).find(".char-item-desc").text();
        let id = $(el).find("a").attr("href");
        const match = id?.match(/\/(\d+)$/);

        hasil.push({
          name: name.trim(),
          desc: desc.trim(),
          id: match ? parseInt(match[1]) : null,
        });
      });
    }

    else if (type === "pets") {
      const response = await axios.get("https://ff.garena.com/id/pets/");
      const $ = cheerio.load(response.data);

      $(".pet-box.pet-box-new").each((i, el) => {
        let name = $(el).find(".pet-name").text();
        let talk = $(el).find(".pet-abstract").text();
        let id = $(el).find("a").attr("href");
        const match = id?.match(/\/(\d+)$/);

        hasil.push({
          name: name.trim(),
          talk: talk.trim(),
          id: match ? parseInt(match[1]) : null,
        });
      });
    }

    else if (type === "news") {
      const response = await axios.get("https://ff.garena.com/id/news/");
      const $ = cheerio.load(response.data);

      $(".news-item.news-elem").each((i, el) => {
        let time = $(el).find(".news-time").text().trim();
        let title = $(el).find(".news-title").text().trim();
        let link = $(el).find("a").attr("href");

        hasil.push({
          title,
          time,
          link: "https://ff.garena.com" + link,
        });
      });
    }

    else {
      return res.json({ status: false, message: "Type tidak valid" });
    }

    res.json({ status: true, total: hasil.length, data: hasil });

  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 FF SEARCH API jalan di http://localhost:${PORT}`);
});