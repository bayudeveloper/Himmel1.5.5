const axios = require('axios');

module.exports = function(app) {
    // Edge speakers yang tersedia
    const EDGE_SPEAKERS = {
        "ja-JP-NanamiNeural-Female": "Japanese - Nanami",
        "en-CA-ClaraNeural-Female": "English (Canada) - Clara",
        "id-ID-GadisNeural-Female": "Indonesian - Gadis",
        "jv-ID-SitiNeural-Female": "Javanese - Siti"
    };

    // Fungsi untuk generate Miku TTS
    async function generateMikuTTS(text, voice = "id-ID-GadisNeural-Female") {
        try {
            // Validasi
            if (!text || text.trim() === '') {
                throw new Error("Text wajib diisi");
            }

            if (!EDGE_SPEAKERS[voice]) {
                throw new Error("Voice tidak valid");
            }

            // Gunakan API TTS yang stabil
            // Option 1: Edge TTS API
            const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text)}`;
            
            // Option 2: Google TTS (fallback)
            const googleTts = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=id&client=tw-ob`;

            return {
                success: true,
                text: text,
                voice: voice,
                voice_name: EDGE_SPEAKERS[voice],
                audio_url: ttsUrl,
                fallback_audio: googleTts,
                format: "mp3"
            };

        } catch (err) {
            throw new Error(`Miku TTS Error: ${err.message}`);
        }
    }

    // ENDPOINT GET - untuk bikin audio
    app.get('/ai/voicemiku', async (req, res) => {
        try {
            const text = req.query.text;
            const voice = req.query.voice || "id-ID-GadisNeural-Female";

            if (!text) {
                return res.status(400).json({
                    status: false,
                    error: "Parameter 'text' wajib diisi!"
                });
            }

            // Validasi voice
            if (!EDGE_SPEAKERS[voice]) {
                return res.status(400).json({
                    status: false,
                    error: "Voice tidak valid"
                });
            }

            // Langsung redirect ke audio URL
            const audioUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text)}`;
            
            // Redirect langsung
            return res.redirect(audioUrl);

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};