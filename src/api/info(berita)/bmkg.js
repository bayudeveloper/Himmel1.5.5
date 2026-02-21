const axios = require('axios')
const cheerio = require('cheerio')

module.exports = function(app) {

    async function gempa() {
        const { data } = await axios.get('https://www.bmkg.go.id/gempabumi/gempabumi-dirasakan.bmkg')
        const $ = cheerio.load(data)

        const drasa = []
        $('table > tbody > tr:nth-child(1) > td:nth-child(6) > span').each((_, el) => {
            let dir = $(el).text()
            drasa.push(dir.replace('\t', ' '))
        })

        let teks = drasa.join('\n')

        return {
            source: 'www.bmkg.go.id',
            data: {
                imagemap: $('div.modal-body img').attr('src'),
                magnitude: $('table > tbody > tr:nth-child(1) > td:nth-child(4)').text(),
                kedalaman: $('table > tbody > tr:nth-child(1) > td:nth-child(5)').text(),
                wilayah: $('table > tbody > tr:nth-child(1) > td:nth-child(6) > a').text(),
                waktu: $('table > tbody > tr:nth-child(1) > td:nth-child(2)').text(),
                lintang_bujur: $('table > tbody > tr:nth-child(1) > td:nth-child(3)').text(),
                dirasakan: teks
            }
        }
    }

    app.get('/random/gempa', async (req, res) => {
        try {
            const result = await gempa()
            res.status(200).json({
                status: true,
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