/**
 * NewsDistributor - Central hub for distributing news to multiple channels
 * Sends news to both Telegram and Web clients
 */

const EventEmitter = require('events');

class NewsDistributor extends EventEmitter {
    constructor(telegramSender = null, persistentStorage = null) {
        super();
        this.telegram = telegramSender;
        this.persistentStorage = persistentStorage;
        this.webClients = new Set();
        this.stats = {
            totalSent: 0,
            webClients: 0,
            lastNews: null
        };

        // Load history dari persistence if available
        if (this.persistentStorage) {
            const history = this.persistentStorage.load();
            if (history.length > 0) {
                this.stats.totalSent = history.length;
                this.stats.lastNews = history[0];
            }
        }
    }

    /**
     * Register a web client (WebSocket connection)
     */
    addWebClient(socket) {
        this.webClients.add(socket);
        this.stats.webClients = this.webClients.size;

        socket.on('disconnect', () => {
            this.webClients.delete(socket);
            this.stats.webClients = this.webClients.size;
        });
    }

    /**
     * Kirim berita ke semua saluran (Telegram + Web)
     */
    async sendNews(item, sourceName, thumbnail, description) {
        const newsData = {
            title: item.title,
            link: item.link,
            source: sourceName,
            thumbnail: thumbnail,
            description: description,
            pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
            timestamp: Date.now()
        };

        let success = false;

        // Kirim berita ke Telegram jika dikonfigurasi
        if (this.telegram) {
            const telegramSuccess = await this.telegram.sendNews(item, sourceName, thumbnail, description);
            success = success || telegramSuccess;
        }

        // Kirim berita ke semua web clients
        if (this.webClients.size > 0) {
            this.webClients.forEach(socket => {
                try {
                    socket.emit('news', newsData);
                } catch (err) {
                    console.error('Error sending to web client:', err.message);
                }
            });
            success = true;
        }

        if (success) {
            this.stats.totalSent++;
            this.stats.lastNews = newsData;

            // Simpan berita ke history
            if (this.persistentStorage) {
                this.persistentStorage.save(newsData);
            }

            this.emit('news-sent', newsData);
        }

        return success;
    }

    /**
     * Get statistik berita
     */
    getStats() {
        return {
            ...this.stats,
            webClients: this.webClients.size
        };
    }
}

module.exports = { NewsDistributor };
