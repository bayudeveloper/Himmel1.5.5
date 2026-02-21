const axios = require('axios');
const FormData = require('form-data');

module.exports = function(app) {
    async function hydromind(content, model) {
        try {
            const form = new FormData();
            form.append('content', content);
            form.append('model', model);
            
            const { data } = await axios.post('https://mind.hydrooo.web.id/v1/chat/', form, {
                headers: form.getHeaders(),
                timeout: 30000
            });
            return data;
        } catch (err) {
            throw new Error(err.message);
        }
    }

    app.get('/ai/hydromind', async (req, res) => {
        try {
            const { text, model } = req.query;
            
            if (!text || !model) {
                return res.status(400).json({ 
                    status: false, 
                    error: 'Text and Model is required' 
                });
            }
            
            const data = await hydromind(text, model);
            
            res.json({
                status: true,
                result: data.result || data
            });
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                error: error.message 
            });
        }
    });
};