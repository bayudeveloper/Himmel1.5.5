const { createCanvas } = require("canvas");

module.exports = function(app) {
    function generateBrat(text, size = 1080) {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, size, size);

        let fontSize = size / 6;
        ctx.font = `bold ${fontSize}px Arial`;

        while (ctx.measureText(text).width > size * 0.85) {
            fontSize -= 5;
            ctx.font = `bold ${fontSize}px Arial`;
        }

        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(text.toLowerCase(), size / 2, size / 2);

        return canvas.toBuffer("image/png");
    }

    app.get("/tools/brat", (req, res) => {
        const text = req.query.text;

        if (!text) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?text="
            });
        }

        const size = parseInt(req.query.size) || 1080;

        try {
            const image = generateBrat(text, size);

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