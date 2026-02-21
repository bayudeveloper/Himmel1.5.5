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
                    error: "Parameter 'text' wajib diisi!",
                    example: "/ai/voicemiku?text=Hallo%20Saya%20Himmel&voice=id-ID-GadisNeural-Female"
                });
            }

            // Validasi voice
            if (!EDGE_SPEAKERS[voice]) {
                return res.status(400).json({
                    status: false,
                    error: "Voice tidak valid",
                    available_voices: Object.keys(EDGE_SPEAKERS)
                });
            }

            // Langsung redirect ke audio URL (biar langsung play)
            const audioUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text)}`;
            
            // Opsi 1: Redirect langsung (recommended)
            return res.redirect(audioUrl);
            
            // Opsi 2: Kalo mau JSON response, uncomment ini:
            /*
            const result = await generateMikuTTS(text, voice);
            res.json({
                status: true,
                data: result
            });
            */

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });

    // Endpoint info
    app.get('/ai/voicemiku/info', (req, res) => {
        res.json({
            status: true,
            name: "Miku TTS",
            description: "Text to Speech dengan suara Miku",
            model: "1a_miku_default_rvc_(apple)",
            available_voices: EDGE_SPEAKERS,
            usage: {
                example: "/ai/voicemiku?text=Hallo%20Saya%20Himmel&voice=id-ID-GadisNeural-Female",
                notes: "Returns audio MP3 directly (redirect)"
            }
        });
    });
};