const axios = require("axios");
const FormData = require("form-data");

module.exports = function(app) {
    class PinDownAPI {
        constructor() {
            this.baseURL = "https://pindown.io";
            this.cookieString = "session_data=c4hsaj2ee4kk5kks9ove11nvbe; _ga_CY8JXYCQJS=GS2.1.s1771162404$o1$g0$t1771162404$j60$l0$h0; _ga=GA1.1.875627844.1771162404; fpestid=2AxYlpwwV0NDSgkfoj8d0rumTS0-s2UCceGQQGEvnaEqHyuQe_vZPNqjpMv0AvABbJ84CQ";
        }

        async download(url, lang = "en") {
            const formData = new FormData();
            formData.append("url", url);
            formData.append("QmiWf", "6b8c851f3ae715b87cada9307a7d8c41");
            formData.append("lang", lang);

            const response = await axios({
                method: "POST",
                url: `${this.baseURL}/action`,
                headers: {
                    "accept": "*/*",
                    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
                    "cookie": this.cookieString,
                    "origin": this.baseURL,
                    "referer": `${this.baseURL}/en1`,
                    "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
                    "sec-ch-ua-mobile": "?1",
                    "sec-ch-ua-platform": '"Android"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36",
                    ...formData.getHeaders(),
                },
                data: formData,
                timeout: 30000
            });

            return response.data;
        }

        parseDownloadLinks(html) {
            const links = [];
            const regex = /<a href='(https:\/\/dl\.pincdn\.app\/v2\?token=[^']+)'.*?class='video-quality'>([^<]+)<\/td>/gs;

            let match;
            while ((match = regex.exec(html)) !== null) {
                if (!match[2].includes("PinDown Android App")) {
                    links.push({
                        quality: match[2].trim(),
                        url: match[1],
                    });
                }
            }

            return links;
        }

        async getDownloadLinks(url, lang = "en") {
            try {
                const result = await this.download(url, lang);

                if (result.success && result.html) {
                    const links = this.parseDownloadLinks(result.html);

                    return {
                        success: true,
                        links: links,
                    };
                }

                return result;
            } catch (err) {
                return {
                    success: false,
                    message: err.message
                };
            }
        }
    }

    /**
     * ENDPOINT: /downloader/pindown?url=https://pin.it/7CaDub5Qe
     * Method: GET
     * Desc: Download Pinterest videos via pindown.io
     */
    app.get('/downloader/pindown', async (req, res) => {
        const { url, lang = 'en' } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' wajib diisi! Contoh: /downloader/pindown?url=https://pin.it/7CaDub5Qe"
            });
        }

        // Validasi URL Pinterest
        if (!url.includes('pin.it') && !url.includes('pinterest.com')) {
            return res.status(400).json({
                status: false,
                message: "URL harus dari Pinterest (pin.it atau pinterest.com)"
            });
        }

        try {
            const api = new PinDownAPI();
            const result = await api.getDownloadLinks(url, lang);

            if (!result.success) {
                return res.status(400).json({
                    status: false,
                    message: result.message || 'Gagal mendapatkan video'
                });
            }

            if (!result.links || result.links.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Tidak ada video yang ditemukan di URL tersebut"
                });
            }

            res.json({
                status: true,
                url: url,
                total: result.links.length,
                data: result.links
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};