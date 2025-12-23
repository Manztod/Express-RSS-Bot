const pLimit = require("p-limit");
const { parseFeed, extractThumbnail, isRecent, domainOf } = require("./feedParser");
const { logWarning } = require("../utils/logger");
const chalk = require("chalk");

class FeedMonitor {
    constructor(storage, newsDistributor, opts) {
        this.storage = storage;
        this.newsDistributor = newsDistributor;
        this.maxErrors = opts.MAX_ERRORS;
        this.skipDelayMs = opts.SKIP_DELAY_MS;
        this.autoResetMs = opts.AUTO_RESET_MS;
        this.recentMinutes = opts.RECENT_MINUTES;
        this.CONCURRENCY = opts.CONCURRENCY || 20;

        this.errorCount = new Map();
        this.errorTime = new Map();
        this.errorReason = new Map();
        this.feedCounter = new Map();
        this.totalSent = 0;
        this.skippedFeeds = new Set();

        this.limit = pLimit(this.CONCURRENCY);
    }

    getFeedName(feedUrl) {
        return domainOf(feedUrl);
    }

    _registerError(feedUrl, reason) {
        const c = (this.errorCount.get(feedUrl) || 0) + 1;
        this.errorCount.set(feedUrl, c);
        this.errorTime.set(feedUrl, Date.now());
        this.errorReason.set(feedUrl, reason || "Unknown");
    }

    getActiveFeedsCount() {
        let active = 0;
        for (const [url, c] of this.errorCount.entries()) {
            if (c < this.maxErrors) active++;
        }
        return active === 0 ? this.skippedFeeds.size : active;
    }

    async checkFeed(feedUrl) {
        const now = Date.now();
        const c = this.errorCount.get(feedUrl) || 0;

        if (c >= this.maxErrors) {
            const last = this.errorTime.get(feedUrl) || 0;
            if (now - last > this.autoResetMs) {
                this.errorCount.set(feedUrl, 0);
                this.skippedFeeds.delete(feedUrl);
                console.log(`\n${chalk.cyan("🔄 RETRY:")} ${this.getFeedName(feedUrl)}`);
            } else {
                if (!this.skippedFeeds.has(feedUrl)) {
                    this.skippedFeeds.add(feedUrl);
                    const remaining = Math.floor((this.autoResetMs - (now - last)) / 1000);
                    console.log(
                        `\n${chalk.yellow("🚫 SKIPPED:")} ${this.getFeedName(feedUrl)} ${chalk.gray(`(retry in ${remaining}s)`)}`
                    );
                }
                await new Promise((r) => setTimeout(r, this.skipDelayMs));
                return [];
            }
        }

        try {
            const feed = await parseFeed(feedUrl);
            const sourceName = feed.title || this.getFeedName(feedUrl);
            if (!Array.isArray(feed.items) || feed.items.length === 0) {
                this._registerError(feedUrl, "Feed kosong / invalid");
                return [];
            }

            const newItems = feed.items.filter((item) => {
                const id = item.guid || item.id || item.link;
                return isRecent(item, this.recentMinutes) && !this.storage.exists(id);
            });

            for (const item of newItems) {
                const title = (item.title || "").trim();
                if (!title || this.storage.isDuplicateTitle(title)) continue;

                const newsId = item.guid || item.id || item.link;
                this.storage.save(newsId, title);

                const thumb = await extractThumbnail(item);
                const desc = (() => {
                    const html = item.contentSnippet || item.content || item.summary || "";
                    const clean = String(html).replace(/<[^>]+>/g, "").trim();
                    return clean.length > 250 ? clean.slice(0, 250) + "…" : clean;
                })();

                const ok = await this.newsDistributor.sendNews(
                    item,
                    sourceName,
                    thumb,
                    desc
                );

                if (ok) {
                    this.feedCounter.set(sourceName, (this.feedCounter.get(sourceName) || 0) + 1);
                    this.totalSent++;
                }
            }

            this.errorCount.set(feedUrl, 0);
            this.errorReason.delete(feedUrl);
            this.skippedFeeds.delete(feedUrl);
            return [];
        } catch (e) {
            const reason = String(e && e.message ? e.message.split(":")[0] : "Feed error");
            this._registerError(feedUrl, reason);
            logWarning(`Feed gagal: ${feedUrl} (${reason})`);
            return [];
        }
    }

    async checkAll(feeds) {
        const tasks = feeds.map((url) => this.limit(() => this.checkFeed(url)));
        await Promise.allSettled(tasks);
    }
}

module.exports = { FeedMonitor };
