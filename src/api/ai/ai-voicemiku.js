const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

module.exports = function(app) {
    const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../../../uploads');
    
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const upload = multer({ 
        dest: uploadDir,
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    });

    app.post('/ai/voicemiku', upload.single('audio'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    message: "Upload file audio pakai form-data field: audio"
                });
            }

            const audioData = fs.readFileSync(req.file.path);
            
            // Hapus file setelah dibaca
            try { fs.unlinkSync(req.file.path); } catch (e) {}

            res.json({
                status: true,
                message: "Voice Miku API is working",
                note: "This is a mock response. Actual voice conversion would happen here.",
                filename: req.file.originalname,
                size: req.file.size
            });

        } catch (err) {
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (e) {}
            }
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};