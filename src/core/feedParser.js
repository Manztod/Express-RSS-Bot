const axios = require('axios');
const Parser = require('rss-parser');
const cheerio = require('cheerio');
const { Colors } = require('../utils/logger');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const browserHeaders = {
    'User-Agent': UA,
    'Accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': 'https://www.google.com/',
    'Connection': 'keep-alive'
};

const parser = new Parser({
    timeout: 15000,
    headers: browserHeaders
});

// Hapus script, tag aneh
const sanitizeXml = (xml) => xml.replace(/<script[\s\S]*?<\/script>/gi, '').trim();

const domainOf = (u) => {
    try {
        const { hostname } = new URL(u);
        return hostname.replace(/^www\./, '');
    } catch {
        return u;
    }
};

function isRecent(item, minutes = 5) {
    const dateStr = item.isoDate || item.pubDate || item.lastBuildDate;
    if (!dateStr) return false;
    const pub = new Date(dateStr);
    if (isNaN(pub.getTime())) return false;
    const now = new Date();
    return (now.getTime() - pub.getTime()) <= minutes * 60 * 1000;
}

async function fetchHtmlMeta(url) {
    try {
        const r = await axios.get(url, {
            headers: { 'User-Agent': UA },
            timeout: 7000,
            maxRedirects: 3,
            validateStatus: (s) => s < 400
        });
        if (!/text\/html/i.test(r.headers['content-type'] || '')) return null;
        const $ = cheerio.load(r.data);
        const og = $('meta[property="og:image"]').attr('content');
        if (og) return og;
        const tw = $('meta[name="twitter:image"]').attr('content');
        if (tw) return tw;
        const img = $('img').first().attr('src');
        return img || null;
    } catch {
        return null;
    }
}

// Ambil thumbnail
async function extractThumbnail(item) {
    // 1 media:thumbnail (seperti RMOL.id)
    if (item['media:thumbnail']?.url) return item['media:thumbnail'].url;
    if (item.media?.url) return item.media.url;

    // 2 enclosure
    if (item.enclosure?.url && /\.(jpg|jpeg|png|webp|gif)$/i.test(item.enclosure.url))
        return item.enclosure.url;

    // 3 ambil dari tag <img> di description atau content:encoded
    const htmlSources = [item['content:encoded'], item.description, item.content];
    for (const html of htmlSources) {
        if (!html) continue;
        try {
            const $ = cheerio.load(String(html));
            const img = $('img').first().attr('src');
            if (img && /^https?:\/\//i.test(img)) return img;
        } catch { }
    }

    // 4 fallback ambil og:image dari halaman asli
    if (item.link && /^https?:\/\//i.test(item.link)) {
        const meta = await fetchHtmlMeta(item.link);
        if (meta) return meta;
    }

    // 5 fallback favicon
    return `https://www.google.com/s2/favicons?domain=${domainOf(item.link || '')}`;
}

// Parse RSS feed apapun (termasuk yang “nakal”)
async function parseFeed(url, retryCount = 3) {
    // ⚠️ Hapus cache buster karena beberapa WAF (seperti Tribunnews) bisa memblokir query param di RSS
    // const withCacheBuster = url.includes('?') ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;
    const targetUrl = url;

    for (let i = 0; i < retryCount; i++) {
        try {
            // Dinamiskan Referer sesuai domain feed
            const urlObj = new URL(targetUrl);
            const dynamicHeaders = {
                ...browserHeaders,
                'Referer': `${urlObj.protocol}//${urlObj.hostname}/`
            };

            const { data } = await axios.get(targetUrl, {
                headers: dynamicHeaders,
                timeout: 15000,
                responseType: 'text',
                transitional: { forcedJSONParsing: false }
            });

            if (!data || String(data).trim().length === 0) {
                throw new Error("Data kosong dari server");
            }

            const clean = sanitizeXml(String(data));
            const feed = await parser.parseString(clean);

            if (!feed || !Array.isArray(feed.items)) {
                console.log(`⚠️ Feed kosong atau invalid: ${url}`);
                return { items: [] };
            }

            // Normalisasi item supaya seragam
            feed.items = feed.items.map((it) => {
                const desc = it.contentSnippet || it.content || it.summary || it.description || "";
                const $ = cheerio.load(String(desc));
                const cleanDesc = $.text().replace(/\s+/g, ' ').trim();

                return {
                    ...it,
                    title: it.title ? String(it.title).trim() : "Tanpa Judul",
                    link: it.link || it.guid || "",
                    description: cleanDesc,
                    isoDate: it.isoDate || it.pubDate,
                    media: it['media:thumbnail']?.url || it.enclosure?.url || null
                };
            });

            return feed;
        } catch (e) {
            const isLastRetry = i === retryCount - 1;
            const is403 = e.response && e.response.status === 403;
            const isXmlError = e.message.includes('Unclosed root tag') || e.message.includes('Invalid character');

            if (isLastRetry) {
                console.log(`❌ Gagal parse RSS [Attempt ${i + 1}]: ${url} (${e.message})`);
                return { items: [] };
            }

            // Jeda sebentar sebelum retry
            const delay = is403 ? 5000 : 2000;
            await new Promise(r => setTimeout(r, delay));
        }
    }
    return { items: [] };
}

module.exports = {
    parseFeed,
    extractThumbnail,
    isRecent,
    domainOf
};
