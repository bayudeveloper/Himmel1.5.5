const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

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

            const model = req.query.model || 'Miku';
            
            // Baca file audio
            const audioFile = fs.createReadStream(req.file.path);
            
            // Kirim ke API voice conversion
            const formData = new FormData();
            formData.append('audio', audioFile);
            formData.append('model', model);

            const response = await axios.post('https://api.voice.ai/v1/convert', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': 'Bearer YOUR_API_KEY' // Daftar di voice.ai untuk API key
                },
                timeout: 30000
            });

            // Hapus file temporary
            fs.unlinkSync(req.file.path);

            if (response.data && response.data.audio_url) {
                res.json({
                    status: true,
                    model: model,
                    original_file: req.file.originalname,
                    converted_audio: response.data.audio_url,
                    duration: response.data.duration || null
                });
            } else {
                throw new Error('Failed to convert voice');
            }

        } catch (err) {
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (e) {}
            }
            
            // Jika API key belum diisi, beri informasi
            res.status(500).json({
                status: false,
                error: err.message,
                note: "Please register at voice.ai to get API key"
            });
        }
    });

    app.get('/ai/voicemiku', (req, res) => {
        res.json({
            status: true,
            message: "Voice Miku API - POST dengan file audio",
            supported_models: ["Miku", "Rin", "Len", "Luka", "KAITO", "MEIKO"],
            usage: {
                endpoint: "/ai/voicemiku?model=Miku",
                method: "POST",
                body: "form-data with field 'audio' (MP3/WAV file)"
            }
        });
    });
};