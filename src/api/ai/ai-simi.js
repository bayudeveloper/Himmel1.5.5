const axios = require('axios');

module.exports = function(app) {
    const bahasaValid = [
        'vn','en','he','zh','ch','id','ko','ph','ru','ar',
        'ms','es','pt','de','th','ja','fr','sv','tr','da',
        'nb','it','nl','fi','ml','hi','kh','ca','ta','rs',
        'mn','fa','pa','cy','hr','el','az','sw','te','pl',
        'ro','si','fy','kk','cs','hu','lt','be','br','af',
        'bg','is','uk','jv','eu','rw','or','al','bn','gn',
        'kn','my','sk','gl','gu','ps','ka','et','tg','as',
        'mr','ne','ur','uz','cx','hy','lv','sl','ku','mk',
        'bs','ig','lb','mg','ny','sn','tt','yo','co','eo',
        'ga','hm','hw','lo','mi','so','ug','am','gd'
    ];

    app.get('/ai/simi', async (req, res) => {
        const teks = req.query.text;
        const bahasa = req.query.lang || 'id';

        if (!teks) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?text="
            });
        }

        if (!bahasaValid.includes(bahasa)) {
            return res.status(400).json({
                status: false,
                message: "Bahasa tidak valid atau tidak didukung"
            });
        }

        try {
            const data = new URLSearchParams();
            data.append('text', teks);
            data.append('lc', bahasa);

            const response = await axios.post(
                'https://api.simsimi.vn/v2/simtalk',
                data
            );

            res.json({
                status: true,
                language: bahasa,
                reply: response.data.message
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.response?.data || err.message
            });
        }
    });
};