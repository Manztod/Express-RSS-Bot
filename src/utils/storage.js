const fs = require('fs');
const path = require('path');

class Storage {
    constructor(filename = 'sent_ids.json', opts = {}) {
        this.filename = path.resolve(process.cwd(), filename);
        this.sentIds = new Set();
        this.sentTitles = new Set();
        this.maxIds = opts.maxIds || 10000; // batas maksimum data yang disimpan
        this.keepLast = opts.keepLast || 6000; // sisakan data terakhir jika sudah penuh
    }

    load() {
        try {
            if (fs.existsSync(this.filename)) {
                const raw = JSON.parse(fs.readFileSync(this.filename, 'utf-8'));
                (raw.ids || []).forEach((v) => this.sentIds.add(v));
                (raw.titles || []).forEach((v) => this.sentTitles.add(v));
                return { ids: this.sentIds.size, titles: this.sentTitles.size };
            }
            return { ids: 0, titles: 0 };
        } catch {
            return { ids: 0, titles: 0 };
        }
    }

    _shrinkIfNeeded() {
        if (this.sentIds.size > this.maxIds) {
            const ids = [...this.sentIds].slice(-this.keepLast);
            this.sentIds = new Set(ids);
        }
        if (this.sentTitles.size > this.maxIds) {
            const titles = [...this.sentTitles].slice(-this.keepLast);
            this.sentTitles = new Set(titles);
        }
    }

    _flush() {
        this._shrinkIfNeeded();
        fs.writeFileSync(this.filename, JSON.stringify({
            ids: [...this.sentIds],
            titles: [...this.sentTitles]
        }, null, 2));
    }

    save(newsId, title) {
        if (newsId) this.sentIds.add(newsId);
        if (title) this.sentTitles.add(title.trim().toLowerCase());
        this._flush();
    }

    exists(newsId) {
        return !!newsId && this.sentIds.has(newsId);
    }

    isDuplicateTitle(title) {
        if (!title) return false;
        return this.sentTitles.has(title.trim().toLowerCase());
    }
}

class PersistentStorage {
    constructor(filename = 'database/news_history.json', maxItems = 1000) {
        this.filename = path.resolve(process.cwd(), filename);
        this.maxItems = maxItems;
        this.data = [];

        // Ensure directory exists
        const dir = path.dirname(this.filename);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    load() {
        try {
            if (fs.existsSync(this.filename)) {
                this.data = JSON.parse(fs.readFileSync(this.filename, 'utf-8'));
                return this.data;
            }
        } catch (e) {
            console.error('Error loading history:', e.message);
        }
        return [];
    }

    save(item) {
        // Prevent duplicates in history
        const exists = this.data.some(existing => existing.link === item.link);
        if (exists) return;

        this.data.unshift(item);
        if (this.data.length > this.maxItems) {
            this.data = this.data.slice(0, this.maxItems);
        }

        try {
            fs.writeFileSync(this.filename, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('Error saving history:', e.message);
        }
    }

    getHistory() {
        return this.data;
    }
}

module.exports = { Storage, PersistentStorage };