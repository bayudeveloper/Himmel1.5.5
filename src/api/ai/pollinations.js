const axios = require('axios');

module.exports = function(app) {

    /**
     * ENDPOINT: GET /ai/pollinations?prompt=a cat&type=image
     * ENDPOINT: GET /ai/pollinations?prompt=a cat&type=video
     * 
     * Query Params:
     *   - prompt : deskripsi yang mau digenerate (wajib)
     *   - type   : "image" atau "video" (default: image)
     *   - model  : model yang dipakai (opsional, khusus image)
     *   - width  : lebar gambar, default 1024 (opsional)
     *   - height : tinggi gambar, default 1024 (opsional)
     *   - seed   : seed angka (opsional)
     *   - nologo : hilangkan watermark, default true (opsional)
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
            const encodedPrompt = encodeURIComponent(prompt);

            if (type === 'image') {
                const params = new URLSearchParams();
                params.set('width', width);
                params.set('height', height);
                params.set('nologo', nologo);
                if (seed) params.set('seed', seed);
                if (model) params.set('model', model);

                const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

                return res.json({
                    status: true,
                    type: 'image',
                    prompt,
                    model: model || 'flux',
                    width: parseInt(width),
                    height: parseInt(height),
                    url: imageUrl
                });

            } else {
                const params = new URLSearchParams();
                params.set('nologo', nologo);
                if (seed) params.set('seed', seed);
                if (model) params.set('model', model);

                const videoUrl = `https://video.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

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
            res.json({
                status: true,
                image_models: ['flux', 'flux-realism', 'flux-cablyai', 'flux-anime', 'flux-3d', 'any-dark', 'flux-pro', 'turbo'],
                video_models: ['default'],
                usage: {
                    image: '/ai/pollinations?prompt=anime girl&type=image&model=flux',
                    video: '/ai/pollinations?prompt=cat walking&type=video'
                }
            });
        }
    });
};
