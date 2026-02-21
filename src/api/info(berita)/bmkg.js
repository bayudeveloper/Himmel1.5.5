const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
    async function getGempa() {
        try {
            const { data } = await axios.get('https://www.bmkg.go.id/gempabumi/gempabumi-dirasakan.bmkg', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                timeout: 10000
            });
            
            const $ = cheerio.load(data);
            
            // Ambil data gempa pertama
            const tr = $('table tbody tr').first();
            
            const waktu = tr.find('td:nth-child(2)').text().trim();
            const koordinat = tr.find('td:nth-child(3)').text().trim();
            const magnitude = tr.find('td:nth-child(4)').text().trim();
            const kedalaman = tr.find('td:nth-child(5)').text().trim();
            const wilayahRaw = tr.find('td:nth-child(6)').text().trim();
            
            // Parse wilayah dan dirasakan
            const wilayahMatch = wilayahRaw.match(/^(.*?)(?: Diraskan| Dirasakan|$)/i);
            const wilayah = wilayahMatch ? wilayahMatch[1].trim() : wilayahRaw;
            
            // Ambil data dirasakan dari span
            const dirasakan = [];
            tr.find('td:nth-child(6) span').each((i, el) => {
                const text = $(el).text().trim();
                if (text && !text.includes('Dirasakan')) {
                    dirasakan.push(text.replace(/\s+/g, ' '));
                }
            });

            // Ambil peta
            const peta = $('div.modal-body img').first().attr('src');
            
            return {
                waktu: waktu || 'Tidak tersedia',
                koordinat: koordinat || 'Tidak tersedia',
                magnitude: magnitude || 'Tidak tersedia',
                kedalaman: kedalaman || 'Tidak tersedia',
                wilayah: wilayah || 'Tidak tersedia',
                dirasakan: dirasakan.length > 0 ? dirasakan : ['Tidak ada laporan dirasakan'],
                peta: peta ? `https://www.bmkg.go.id${peta}` : null,
                sumber: 'Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)'
            };
        } catch (error) {
            console.error("BMKG error:", error.message);
            throw new Error("Gagal mengambil data BMKG");
        }
    }

    app.get('/info/bmkg', async (req, res) => {
        try {
            const result = await getGempa();
            res.json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};