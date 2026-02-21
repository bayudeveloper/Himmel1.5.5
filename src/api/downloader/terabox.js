const axios = require("axios");

module.exports = function(app) {
    function extractId(link) {
        const patterns = [
            /\/s\/([a-zA-Z0-9_-]+)/,
            /surl=([a-zA-Z0-9_-]+)/,
            /\/sharing\/([a-zA-Z0-9_-]+)/
        ];
        
        for (let pattern of patterns) {
            const match = link.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    async function teraboxDownload(url) {
        try {
            // Gunakan API publik
            const response = await axios.get(`https://terabox-dl.phiros.workers.dev/?url=${encodeURIComponent(url)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 30000
            });

            if (response.data && response.data.ok) {
                return {
                    filename: response.data.fileName || response.data.name || 'Unknown',
                    size: response.data.size || 'Unknown',
                    type: response.data.mimeType || 'application/octet-stream',
                    thumbnail: response.data.thumb || response.data.thumbnail || null,
                    download: response.data.downloadLink || response.data.dlink || response.data.url,
                    direct: response.data.direct || false
                };
            }
            throw new Error('Failed to get data');
        } catch (err) {
            // Coba API alternatif
            try {
                const altResponse = await axios.get(`https://terabox.hmm203.workers.dev/?url=${encodeURIComponent(url)}`, {
                    timeout: 30000
                });

                if (altResponse.data && altResponse.data.success) {
                    return {
                        filename: altResponse.data.file_name,
                        size: altResponse.data.size,
                        download: altResponse.data.download_url
                    };
                }
            } catch (altErr) {
                // Fallback ke mock jika semua API gagal
                return {
                    filename: "file_from_terabox.ext",
                    size: "Unknown",
                    note: "Using mock data - API unavailable",
                    original_url: url
                };
            }
            throw err;
        }
    }

    app.get("/downloader/terabox", async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?url="
            });
        }

        const id = extractId(url);
        if (!id) {
            return res.status(400).json({
                status: false,
                message: "Link Terabox tidak valid"
            });
        }

        try {
            const result = await teraboxDownload(url);
            
            res.json({
                status: true,
                id: id,
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