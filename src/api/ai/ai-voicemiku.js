const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

module.exports = function(app) {
    const api = {
        url: "https://api.termai.cc",
        key: "TermAI-4ALwMabCh0KiN9I3"
    };

    const upload = multer({ dest: path.join(__dirname, '../../../uploads/') });

    app.post('/ai/voicemiku', upload.single('audio'), async (req, res) => {
        try {
            const model = req.query.model || "Miku";

            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    message: "Upload file audio pakai form-data field: audio"
                });
            }

            const audioData = fs.readFileSync(req.file.path);

            const response = await axios({
                method: "post",
                url: `${api.url}/api/audioProcessing/voice-covers`,
                params: {
                    model,
                    key: api.key
                },
                data: audioData,
                responseType: "stream",
                headers: {
                    "Content-Type": "audio/mpeg"
                },
                timeout: 600000
            });

            let buffer = "";

            response.data.on("data", chunk => {
                buffer += chunk.toString();

                const lines = buffer.split("\n");

                for (let line of lines) {
                    if (!line.startsWith("data:")) continue;

                    const jsonStr = line.replace("data: ", "").trim();

                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.status === "success") {
                            fs.unlinkSync(req.file.path);

                            return res.json({
                                status: true,
                                model,
                                result: data.result
                            });
                        }

                        if (data.status === "failed") {
                            fs.unlinkSync(req.file.path);

                            return res.status(500).json(data);
                        }

                    } catch (e) {}
                }
            });

            response.data.on("error", err => {
                fs.unlinkSync(req.file.path);
                res.status(500).json({ status: false, error: err.message });
            });

        } catch (err) {
            if (req.file) fs.unlinkSync(req.file.path);
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};