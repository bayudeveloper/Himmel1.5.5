const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = 3000;

/* ===========================
   SCRAPE FUNCTION
=========================== */
async function scrapeSoundCloud(query) {
  try {
    const url = `https://m.soundcloud.com/search?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);
    let results = [];

    $(".List_VerticalList__2uQYU li").each((index, element) => {
      const title = $(element)
        .find(".Cell_CellLink__3yLVS")
        .attr("aria-label");

      const href = $(element)
        .find(".Cell_CellLink__3yLVS")
        .attr("href");

      if (title && href) {
        results.push({
          title,
          url: "https://m.soundcloud.com" + href
        });
      }
    });

    return results.slice(0, 5);

  } catch (error) {
    console.error("Error scraping:", error.message);
    return [];
  }
}

/* ===========================
   ENDPOINT
=========================== */
app.get("/soundcloud", async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.status(400).json({
      status: false,
      message: "Masukkan parameter ?query="
    });
  }

  try {
    const results = await scrapeSoundCloud(query);

    res.json({
      status: true,
      total: results.length,
      result: results
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

/* ===========================
   START SERVER
=========================== */
app.listen(PORT, () => {
  console.log(`🚀 SoundCloud API jalan di http://localhost:${PORT}`);
});