const { createCanvas } = require('@napi-rs/canvas');

module.exports = function(app) {
    function generateBrat(text, size = 1080) {
        try {
            // Create canvas 1:1
            const canvas = createCanvas(size, size);
            const ctx = canvas.getContext("2d");

            // Background PUTIH
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, size, size);

            // SET WARNA HITAM untuk teks
            ctx.fillStyle = "#000000";
            
            // Set font dengan ukuran besar (fix biar keliatan)
            let fontSize = Math.floor(size / 4); // 270px untuk 1080 (lebih gede)
            
            // Coba dengan font default dulu
            ctx.font = `bold ${fontSize}px "Arial", "Helvetica", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // Log untuk debugging (hapus nanti)
            console.log(`Generating brat for: "${text}" with font size: ${fontSize}`);

            // Gambar teks dengan background hitam dulu buat test (hapus nanti)
            ctx.fillText(text, size / 2, size / 2);

            // Kembalikan buffer
            return canvas.toBuffer("image/png");
            
        } catch (err) {
            console.error("Brat generator error:", err);
            throw new Error("Gagal generate gambar brat");
        }
    }

    // Endpoint GET untuk brat generator
    app.get("/tools/brat", (req, res) => {
        const text = req.query.text;

        if (!text) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?text="
            });
        }

        try {
            // Generate gambar
            const image = generateBrat(text);

            // Set response headers
            res.set({
                "Content-Type": "image/png",
                "Content-Disposition": `inline; filename="brat.png"`,
                "Content-Length": image.length,
                "Cache-Control": "no-cache"
            });

            // Kirim gambar
            res.send(image);
            
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};