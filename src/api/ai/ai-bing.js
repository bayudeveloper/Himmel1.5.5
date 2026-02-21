const { fetch } = require('undici');
const fakeUserAgent = require('fake-useragent');

module.exports = function(app) {
    const BING_URL = "https://www.bing.com";

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    async function getBingCookie() {
        try {
            const res = await fetch(BING_URL, {
                headers: { 
                    "user-agent": fakeUserAgent(),
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
                }
            });
            
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const rawCookies = res.headers.raw()['set-cookie'];
            if (!rawCookies) throw new Error("No cookies received");
            
            const cookieString = rawCookies.join(";");
            const match = cookieString.match(/_U=([^;]+)/);
            if (!match) throw new Error("_U cookie not found");
            
            return `_U=${match[1]}`;
        } catch (err) {
            throw new Error("Failed to get Bing cookie: " + err.message);
        }
    }

    async function generateImage(prompt) {
        try {
            const encodedPrompt = encodeURIComponent(prompt);
            const cookie = await getBingCookie();

            const createUrl = `${BING_URL}/images/create?q=${encodedPrompt}&rt=3&FORM=GENCRE`;

            const response = await fetch(createUrl, {
                method: "POST",
                headers: {
                    "user-agent": fakeUserAgent(),
                    "cookie": cookie,
                    "content-type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({ q: encodedPrompt, qa: "ds" }).toString(),
                redirect: "manual"
            });

            const redirect = response.headers.get("location");
            if (!redirect) throw new Error("Failed to get redirect");

            const requestId = redirect.split("id=")[1];
            if (!requestId) throw new Error("Failed to get request ID");

            await fetch(`${BING_URL}${redirect}`, {
                headers: { cookie }
            });

            const resultUrl = `${BING_URL}/images/create/async/results/${requestId}?q=${encodedPrompt}`;
            const start = Date.now();

            while (true) {
                if (Date.now() - start > 60000) throw new Error("Timeout after 60 seconds");
                await sleep(2000);

                const res = await fetch(resultUrl, { headers: { cookie } });
                if (!res.ok) continue;

                const text = await res.text();

                if (text && !text.includes("errorMessage") && !text.includes("<!--")) {
                    const links = [...text.matchAll(/src="([^"]*)"/g)]
                        .map(m => m[1].split("?w=")[0])
                        .filter(link => link.includes('bing.com') && !link.includes('r.bing.com'));
                    
                    if (links.length > 0) {
                        return [...new Set(links)];
                    }
                }
            }
        } catch (err) {
            throw new Error(err.message);
        }
    }

    app.get('/ai/bing', async (req, res) => {
        const prompt = req.query.text || req.query.prompt;

        if (!prompt) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter ?text="
            });
        }

        try {
            const images = await generateImage(prompt);
            res.json({
                status: true,
                prompt,
                total: images.length,
                images
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    });
};