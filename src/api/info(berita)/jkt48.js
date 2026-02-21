const axios = require("axios")
const cheerio = require("cheerio")

module.exports = function(app) {

  async function jktNews(lang = "id") {
    const { data } = await axios.get(`https://jkt48.com/news/list?lang=${lang}`)
    const $ = cheerio.load(data)

    const news = []

    $(".entry-news__list").each((_, element) => {
      const title = $(element).find("h3 a").text().trim()
      const link = $(element).find("h3 a").attr("href")
      const date = $(element).find("time").text().trim()

      news.push({
        title,
        link: link ? "https://jkt48.com" + link : null,
        date
      })
    })

    return news
  }

  app.get("/news/jkt48", async (req, res) => {
    try {
      const { lang } = req.query
      const result = await jktNews(lang || "id")

      res.status(200).json({
        status: true,
        total: result.length,
        result
      })

    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message
      })
    }
  })

}