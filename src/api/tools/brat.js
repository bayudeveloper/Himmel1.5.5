const { createCanvas, registerFont } = require('canvas');
const path = require('path');

module.exports = function(app) {
    function generateBrat(text, size = 1080) {
        try {
            const canvas = createCanvas(size, size);
            const ctx = canvas.getContext("2d");

            // Background hijau brat
            ctx.fillStyle = "#8ACE00";
            ctx.fillRect(0, 0, size, size);

            // Font size auto
            let fontSize = Math.floor(size / 8);
            ctx.font = `bold ${fontSize}px Arial`;

            while (ctx.measureText(text).width > size * 0.9 && fontSize > 20) {
                fontSize -= 5;
                ctx.font = `bold ${fontSize}px Arial`;
            }

            // Text hitam
            ctx.fillStyle = "#000000";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            // Split text per kata untuk efek brat
            const words = text.split(' ');
            if (words.length > 1) {
                // Multi-line untuk text panjang
                ctx.font = `bold ${Math.floor(fontSize * 0.6)}px Arial`;
                words.forEach((word, i) => {
                    ctx.fillText(word, size / 2, size / 2 - 30 + (i * 60));
                });
            } else {
                // Single line untuk text pendek
                ctx.fillText(text, size / 2, size / 2);
            }

            return canvas.toBuffer("image/png");
        } catch (err) {
            throw err;
        }
    }

    app.get("/tools/brat", (req, res) => {
        const text = req.query.text;

        if (!text) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?text="
            });
        }

        try {
            const image = generateBrat(text);

            res.set({
                "Content-Type": "image/png",
                "Content-Disposition": `inline; filename="brat.png"`
            });

            res.send(image);
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};