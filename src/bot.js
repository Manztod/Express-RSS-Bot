const {
    TELEGRAM_TOKEN,
    CHAT_ID,
    RSS_FEEDS,
    RECENT_MINUTES,
    MAX_ERRORS,
    SKIP_DELAY_MS,
    AUTO_RESET_MS,
    CONCURRENCY,
} = require("./config");

const { Storage, PersistentStorage } = require("./utils/storage");
const { TelegramSender } = require("./core/telegramSender");
const { NewsDistributor } = require("./core/newsDistributor");
const { FeedMonitor } = require("./core/feedMonitor");
const { WebServer } = require("./server");
const {
    printBanner,
    printStatusBar,
    showStartupAnimation,
    logError,
} = require("./utils/logger");

if (!TELEGRAM_TOKEN || !CHAT_ID) {
    console.error("❌ Harap isi TELEGRAM_TOKEN dan CHAT_ID di file .env");
    process.exit(1);
}

(async () => {
    await showStartupAnimation();

    const storage = new Storage("sent_ids.json");
    const loaded = storage.load();

    const telegram = new TelegramSender(TELEGRAM_TOKEN, CHAT_ID);

    const historyStorage = new PersistentStorage("database/news_history.json", 1000);
    const newsDistributor = new NewsDistributor(telegram, historyStorage);
    const monitor = new FeedMonitor(storage, newsDistributor, {
        MAX_ERRORS,
        SKIP_DELAY_MS,
        AUTO_RESET_MS,
        RECENT_MINUTES,
        CONCURRENCY,
    });

    console.clear();
    printBanner(RSS_FEEDS.length);
    console.log(`✓ Loaded cache: ${loaded.ids} IDs, ${loaded.titles} titles`);

    const webServer = new WebServer(newsDistributor, monitor, RSS_FEEDS);
    webServer.start();

    console.log("──────────────────────────────────────────────────────────────\n");

    console.log("──────────────────────────────────────────────────────────────\n");

    async function loop() {
        try {
            const beforeTotal = monitor.totalSent;
            await monitor.checkAll(RSS_FEEDS);


            printStatusBar(
                monitor.getActiveFeedsCount(),
                RSS_FEEDS.length,
                monitor.totalSent
            );

            // Delay 15 detik sebelum pengecekan berikutnya biar ga dianggap serangan bot
            await new Promise((r) => setTimeout(r, 15000));
            loop();
        } catch (err) {
            logError("💥 FATAL ERROR", err);
            setTimeout(loop, 2000); // hanya jika error, jeda 2 detik agar tidak crash
        }
    }

    loop();

    process.on("SIGINT", () => {
        console.log("\n──────────────────────────────────────────────────────────────");
        console.log("⏹  Bot dihentikan manual");
        console.log(`📨 Total berita terkirim: ${monitor.totalSent}`);
        console.log("──────────────────────────────────────────────────────────────\n");
        process.exit(0);
    });
})();
