const https = require("https");

module.exports = function(app) {
    const SERPAPI_KEY = "0be5ff098bed53fb055200fa4628d44ff9863d8788c1f98c6069b4ca1773c3b5";
    const BASE_URL = "https://serpapi.com/search.json";

    function serpApiRequest(params) {
        return new Promise((resolve, reject) => {
            params.api_key = SERPAPI_KEY;

            const queryString = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join("&");

            const url = `${BASE_URL}?${queryString}`;

            https.get(url, (res) => {
                let data = "";

                res.on("data", chunk => data += chunk);
                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);

                        if (json.error) {
                            reject(new Error(json.error));
                        } else {
                            resolve(json);
                        }

                    } catch {
                        reject(new Error("Gagal parse response"));
                    }
                });

            }).on("error", reject);
        });
    }

    app.get("/search/google", async (req, res) => {
        const { q, type = "google", num = 10 } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?q="
            });
        }

        try {
            let params = { q, num };

            switch (type) {
                case "images":
                    params.engine = "google";
                    params.tbm = "isch";
                    break;
                case "news":
                    params.engine = "google";
                    params.tbm = "nws";
                    break;
                case "shopping":
                    params.engine = "google";
                    params.tbm = "shop";
                    break;
                case "youtube":
                    params.engine = "youtube";
                    params.search_query = q;
                    delete params.q;
                    break;
                default:
                    params.engine = "google";
            }

            const result = await serpApiRequest(params);

            res.json({
                status: true,
                type,
                query: q,
                result
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};