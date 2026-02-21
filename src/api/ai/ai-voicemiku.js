const axios = require('axios');

module.exports = function(app) {
    // URL Space Hugging Face Miku TTS
    const HF_SPACE_URL = "https://john6666-mikuttis.hf.space";
    
    // Cache untuk session
    let sessionHash = null;
    let sessionCookies = null;

    // Edge speakers yang tersedia (4 aja)
    const EDGE_SPEAKERS = {
        "ja-JP-NanamiNeural-Female": "Japanese - Nanami",
        "en-CA-ClaraNeural-Female": "English (Canada) - Clara",
        "id-ID-GadisNeural-Female": "Indonesian - Gadis",
        "jv-ID-SitiNeural-Female": "Javanese - Siti"
    };

    async function initSession() {
        try {
            const response = await axios.get(HF_SPACE_URL, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const cookies = response.headers['set-cookie'];
            if (cookies) {
                sessionCookies = cookies.join('; ');
            }
            
            sessionHash = `mikuttssession_${Date.now()}`;
            
            return { cookies: sessionCookies, hash: sessionHash };
        } catch (err) {
            console.error("Failed to get session:", err.message);
            throw new Error("Gagal menginisialisasi session Miku TTS");
        }
    }

    async function generateMikuTTS(text, edgeVoice = "id-ID-GadisNeural-Female") {
        try {
            // Validasi input
            if (!text || text.trim() === '') {
                throw new Error("Text harus diisi");
            }

            if (!EDGE_SPEAKERS[edgeVoice]) {
                throw new Error("Edge speaker tidak valid. Pilih: ja-JP-NanamiNeural-Female, en-CA-ClaraNeural-Female, id-ID-GadisNeural-Female, jv-ID-SitiNeural-Female");
            }

            // Inisialisasi session jika belum ada
            if (!sessionHash) {
                await initSession();
            }

            // Prediksi API endpoint Gradio
            const predictUrl = `${HF_SPACE_URL}/run/predict`;
            
            // Payload dengan model FIX 1a_miku_default_rcv (model=1)
            // Berdasarkan screenshot:
            // Model = 1 (1a_miku_default_rvc_(apple))
            // Tune = 6 (default)
            // Pitch method = rmvpe (true untuk high quality)
            // Index rate = 0.5
            // Protect = 0.5
            // Speed = 0
            const payload = {
                data: [
                    1,           // Model FIX: 1a_miku_default_rvc_(apple)
                    6,           // Tune value (default)
                    true,        // rmvpe (true = high quality)
                    0.5,         // Index rate
                    0.5,         // Protect
                    edgeVoice,   // Edge-tts speaker
                    0,           // Speech speed
                    text         // Input text
                ],
                event_data: null,
                fn_index: 0,
                session_hash: sessionHash
            };

            const response = await axios.post(predictUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Cookie': sessionCookies || '',
                    'Origin': HF_SPACE_URL,
                    'Referer': `${HF_SPACE_URL}?__theme=light`
                },
                timeout: 60000
            });

            // Parse response dari Gradio
            if (response.data && response.data.data) {
                const result = response.data.data;
                
                // Response biasanya berisi array:
                // [audio_data, text_output, info_output]
                const audioData = result[0];
                const outputInfo = result[2] || "Success";

                let audioUrl = null;
                if (typeof audioData === 'string') {
                    if (audioData.startsWith('data:audio')) {
                        audioUrl = audioData;
                    } else if (audioData.startsWith('http')) {
                        audioUrl = audioData;
                    }
                }

                return {
                    success: true,
                    text: text,
                    model: "1a_miku_default_rvc_(apple)",
                    edge_voice: edgeVoice,
                    edge_voice_name: EDGE_SPEAKERS[edgeVoice],
                    audio: audioUrl || "Audio generated",
                    info: outputInfo
                };
            }

            throw new Error("Invalid response from Miku TTS");

        } catch (err) {
            console.error("Miku TTS error:", err);
            throw new Error(`Gagal generate Miku TTS: ${err.message}`);
        }
    }

    // POST endpoint
    app.post('/ai/voicemiku', async (req, res) => {
        try {
            const { text, edge_voice } = req.body;

            if (!text) {
                return res.status(400).json({
                    status: false,
                    error: "Parameter 'text' wajib diisi"
                });
            }

            const result = await generateMikuTTS(text, edge_voice);

            res.json({
                status: true,
                data: result
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });

    // GET endpoint
    app.get('/ai/voicemiku', async (req, res) => {
        const { text, voice } = req.query;

        if (!text) {
            return res.json({
                status: true,
                name: "Miku TTS",
                description: "Text-to-Speech dengan suara Hatsune Miku",
                model: "1a_miku_default_rvc_(apple) (FIXED)",
                available_voices: EDGE_SPEAKERS,
                usage: {
                    post: {
                        endpoint: "/ai/voicemiku",
                        method: "POST",
                        body: {
                            text: "Text yang akan diubah ke suara (wajib)",
                            edge_voice: "Pilih: ja-JP-NanamiNeural-Female, en-CA-ClaraNeural-Female, id-ID-GadisNeural-Female, jv-ID-SitiNeural-Female (opsional, default: id-ID-GadisNeural-Female)"
                        }
                    },
                    get: {
                        endpoint: "/ai/voicemiku?text=halo&voice=id-ID-GadisNeural-Female",
                        method: "GET"
                    }
                },
                examples: [
                    {
                        text: "こんにちは、私の名前は初音ミクです！",
                        voice: "ja-JP-NanamiNeural-Female"
                    },
                    {
                        text: "Halo. Nama saya Hatsune Miku!",
                        voice: "id-ID-GadisNeural-Female"
                    },
                    {
                        text: "Hello there. My name is Hatsune Miku!",
                        voice: "en-CA-ClaraNeural-Female"
                    },
                    {
                        text: "Halo. Jenengku Hatsune Miku!",
                        voice: "jv-ID-SitiNeural-Female"
                    }
                ]
            });
        }

        // Generate dengan parameter dari query
        try {
            const validVoices = Object.keys(EDGE_SPEAKERS);
            const selectedVoice = validVoices.includes(voice) ? voice : "id-ID-GadisNeural-Female";
            
            const result = await generateMikuTTS(text, selectedVoice);
            res.json({
                status: true,
                data: result
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};