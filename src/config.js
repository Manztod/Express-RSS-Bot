require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
const CHAT_ID = process.env.CHAT_ID || '';

// RSS Feed yang akan diambil
const RSS_FEEDS = [
    "https://www.tribunnews.com/rss",
    "https://aceh.tribunnews.com/rss",
    "https://medan.tribunnews.com/rss",
    "https://pekanbaru.tribunnews.com/rss",
    "https://padang.tribunnews.com/rss",
    "https://palembang.tribunnews.com/rss",
    "https://lampung.tribunnews.com/rss",
    "https://banten.tribunnews.com/rss",
    "https://jabar.tribunnews.com/rss",
    "https://bogor.tribunnews.com/rss",
    "https://cirebon.tribunnews.com/rss",
    "https://jateng.tribunnews.com/rss",
    "https://solo.tribunnews.com/rss",
    "https://jogja.tribunnews.com/rss",
    "https://jatim.tribunnews.com/rss",
    "https://bali.tribunnews.com/rss",
    "https://banjarmasin.tribunnews.com/rss",
    "https://pontianak.tribunnews.com/rss",
    "https://makassar.tribunnews.com/rss",
    "https://manado.tribunnews.com/rss",
    "https://ambon.tribunnews.com/rss",
    "https://papua.tribunnews.com/rss",
    "https://news.detik.com/rss",
    "https://rss.tempo.co",
    "https://www.antaranews.com/rss/top-news",
    "https://www.antaranews.com/rss/ekonomi",
    "https://www.cnbcindonesia.com/rss",
    "https://www.cnnindonesia.com/rss",
    "https://www.republika.co.id/rss",
    "https://www.viva.co.id/get/all",
    "https://www.antaranews.com/rss/top-news.xml",
    "https://www.antaranews.com/rss/politik.xml",
    "https://www.antaranews.com/rss/hukum.xml",
    "https://www.antaranews.com/rss/olahraga.xml",
    "https://www.antaranews.com/rss/terkini.xml",
    "https://www.okezone.com/rss",
    "https://rmol.id/rss",
    "https://rss.kompas.com/api/feed/social?apikey=bc58c81819dff4b8d5c53540a2fc7ffd83e6314a",
    "https://lapi.kumparan.com/v2.0/rss",
    "https://tirto.id/sitemap/r/google-discover",
    "https://feed.liputan6.com/rss/news",
    "https://www.sindonews.com/feed"
];


module.exports = {
    TELEGRAM_TOKEN,
    CHAT_ID,
    RSS_FEEDS,
    RECENT_MINUTES: 5,            // hanya kirim berita < 5 menit
    MAX_ERRORS: 3,                // skip feed setelah 5 error berturut
    SKIP_DELAY_MS: 10000,        // jeda ketika feed di-skip
    AUTO_RESET_MS: 180_000,       // 3 menit untuk reset error feed
    CONCURRENCY: 5                // batas paralel fetch (jangan terlalu tinggi agar tidak diblokir)
};
