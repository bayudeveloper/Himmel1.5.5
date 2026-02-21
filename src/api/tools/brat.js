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

            // Hitung font size berdasarkan panjang teks
            let fontSize = Math.floor(size / 8); // start 135px untuk 1080
            
            // Set font
            ctx.font = `bold ${fontSize}px "Arial", "Helvetica", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#000000"; // Teks HITAM

            // Ukur lebar teks
            let textWidth = ctx.measureText(text).width;
            
            // Kurangi font size jika kepanjangan
            while (textWidth > size * 0.9 && fontSize > 30) {
                fontSize -= 5;
                ctx.font = `bold ${fontSize}px "Arial", "Helvetica", sans-serif`;
                textWidth = ctx.measureText(text).width;
            }

            // Split teks jika terlalu panjang
            const words = text.split(' ');
            const maxWidth = size * 0.85;
            
            if (textWidth > maxWidth && words.length > 1) {
                // Bikin baris-baris
                let lines = [];
                let currentLine = words[0];
                
                for (let i = 1; i < words.length; i++) {
                    let testLine = currentLine + ' ' + words[i];
                    let testWidth = ctx.measureText(testLine).width;
                    
                    if (testWidth > maxWidth) {
                        lines.push(currentLine);
                        currentLine = words[i];
                    } else {
                        currentLine = testLine;
                    }
                }
                lines.push(currentLine);
                
                // Hitung posisi Y
                const lineHeight = fontSize * 1.2;
                const startY = (size / 2) - ((lines.length - 1) * lineHeight / 2);
                
                // Gambar tiap baris
                lines.forEach((line, index) => {
                    ctx.fillText(line, size / 2, startY + (index * lineHeight));
                });
            } else {
                // Teks pendek, langsung gambar di tengah
                ctx.fillText(text, size / 2, size / 2);
            }

            // Return buffer PNG
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