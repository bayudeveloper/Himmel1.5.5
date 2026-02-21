const express = require('express');
const { fetch } = require('undici');
const FormData = require('form-data');
const fakeUserAgent = require('fake-useragent');

const app = express();
const PORT = process.env.PORT || 3000;
const BING_URL = "https://www.bing.com";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ===========================
   AUTO COOKIE
=========================== */
async function getBingCookie() {
    const res = await fetch(BING_URL, {
        headers: {
            "user-agent": fakeUserAgent()
        }
    });

    const rawCookies = res.headers.raw()['set-cookie'];
    if (!rawCookies) throw new Error("No cookies received");

    const cookieString = rawCookies.join(";");
    const match = cookieString.match(/_U=([^;]+)/);

    if (!match) throw new Error("_U cookie not found");

    return `_U=${match[1]}`;
}

/* ===========================
   GENERATE IMAGE
=========================== */
async function generateImage(prompt) {
    const encodedPrompt = encodeURIComponent(prompt);
    const cookie = await getBingCookie();

    const formData = new FormData();
    formData.append("q", encodedPrompt);
    formData.append("qa", "ds");

    const createUrl = `${BING_URL}/images/create?q=${encodedPrompt}&rt=3&FORM=GENCRE`;

    const response = await fetch(createUrl, {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": fakeUserAgent(),
            "cookie": cookie
        },
        body: formData,
        redirect: "manual"
    });

    const redirect = response.headers.get("location");
    if (!redirect) throw new Error("Failed to get redirect");

    const requestId = redirect.split("id=")[1];

    await fetch(`${BING_URL}${redirect}`, {
        headers: { cookie }
    });

    const resultUrl = `${BING_URL}/images/create/async/results/${requestId}?q=${encodedPrompt}`;
    const start = Date.now();

    while (true) {
        if (Date.now() - start > 200000)
            throw new Error("Timeout");

        await sleep(1500);

        const res = await fetch(resultUrl, {
            headers: { cookie }
        });

        const text = await res.text();

        if (text && !text.includes("errorMessage")) {
            const links = [...text.matchAll(/src="([^"]*)"/g)]
                .map(m => m[1].split("?w=")[0])
                .filter(link => !/r.bing.com\/rp/i.test(link));

            return [...new Set(links)];
        }
    }
}

/* ===========================
   ROUTE API
=========================== */
app.get('/bing', async (req, res) => {
    const prompt = req.query.prompt;

    if (!prompt) {
        return res.status(400).json({
            status: false,
            message: "Masukkan parameter ?prompt="
        });
    }

    try {
        const images = await generateImage(prompt);

        res.json({
            status: true,
            creator: "Bayz Hosting",
            prompt,
            images
        });

    } catch (err) {
        res.status(500).json({
            status: false,
            error: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 biniIMG API jalan di http://localhost:${PORT}`);
});