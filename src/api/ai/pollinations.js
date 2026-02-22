const axios = require('axios');

module.exports = function(app) {

    /**
     * ENDPOINT: GET /ai/pollinations?prompt=a cat&type=image
     * ENDPOINT: GET /ai/pollinations?prompt=a cat&type=video
     * Desc: Generate image or video from prompt using Pollinations AI (free, no login)
     * 
     * Query Params:
     *   - prompt : teks deskripsi yang mau digenerate (wajib)
     *   - type   : "image" atau "video" (default: image)
     *   - model  : model yang dipakai (opsional)
     *   - width  : lebar gambar, default 1024 (khusus image)
     *   - height : tinggi gambar, default 1024 (khusus image)
     *   - seed   : seed angka untuk hasil konsisten (opsional)
     *   - nologo : hilangkan watermark logo, default true
     */
    app.get('/ai/pollinations', async (req, res) => {
        const {
            prompt,
            type = 'image',
            model,
            width = '1024',
            height = '1024',
            seed,
            nologo = 'true'
        } = req.query;

        if (!prompt) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'prompt' wajib diisi! Contoh: /ai/pollinations?prompt=anime girl&type=image"
            });
        }

        if (!['image', 'video'].includes(type)) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'type' harus 'image' atau 'video'"
            });
        }

        try {
            if (type === 'image') {
                // ==================== IMAGE ====================
                const encodedPrompt = encodeURIComponent(prompt);

                // Build URL
                const params = new URLSearchParams();
                if (width) params.set('width', width);
                if (height) params.set('height', height);
                if (seed) params.set('seed', seed);
                if (nologo) params.set('nologo', nologo);
                if (model) params.set('model', model);

                const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

                // Fetch image untuk pastiin berhasil
                const response = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                const contentType = response.headers['content-type'] || 'image/jpeg';

                return res.json({
                    status: true,
                    type: 'image',
                    prompt,
                    model: model || 'flux',
                    width: parseInt(width),
                    height: parseInt(height),
                    url: imageUrl
                });

            } else if (type === 'video') {
                // ==================== VIDEO ====================
                const encodedPrompt = encodeURIComponent(prompt);

                const params = new URLSearchParams();
                if (seed) params.set('seed', seed);
                if (model) params.set('model', model);
                if (nologo) params.set('nologo', nologo);

                const videoUrl = `https://video.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

                // Fetch video untuk pastiin berhasil
                const response = await axios.get(videoUrl, {
                    responseType: 'stream',
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                const contentType = response.headers['content-type'] || 'video/mp4';

                return res.json({
                    status: true,
                    type: 'video',
                    prompt,
                    model: model || 'default',
                    url: videoUrl
                });
            }

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });

    // ==================== LIST MODELS ====================
    /**
     * ENDPOINT: GET /ai/pollinations/models
     * Desc: List semua model yang tersedia
     */
    app.get('/ai/pollinations/models', async (req, res) => {
        try {
            const response = await axios.get('https://image.pollinations.ai/models', {
                timeout: 10000
            });

            res.json({
                status: true,
                image_models: response.data,
                video_models: ['default'],
                usage: {
                    image: '/ai/pollinations?prompt=anime girl&type=image&model=flux',
                    video: '/ai/pollinations?prompt=cat walking&type=video'
                }
            });
        } catch (err) {
            // Fallback list model
            res.json({
                status: true,
                image_models: [
                    'flux',
                    'flux-realism',
                    'flux-cablyai',
                    'flux-anime',
                    'flux-3d',
                    'any-dark',
                    'flux-pro',
                    'turbo'
                ],
                video_models: ['default'],
                usage: {
                    image: '/ai/pollinations?prompt=anime girl&type=image&model=flux',
                    video: '/ai/pollinations?prompt=cat walking&type=video'
                }
            });
        }
    });
};
