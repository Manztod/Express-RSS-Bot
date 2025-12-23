const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

class WebServer {
    constructor(newsDistributor, feedMonitor, rssFeeds) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.newsDistributor = newsDistributor;
        this.feedMonitor = feedMonitor;
        this.rssFeeds = rssFeeds;
        this.port = process.env.PORT || process.env.WEB_PORT || 3000;

        // Store news history (max 99999 articles)
        this.newsHistory = [];
        this.MAX_HISTORY = 99999;

        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupNewsListener();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        const publicPath = path.resolve(__dirname, '..', 'public');
        console.log(`Serving static files from: ${publicPath}`);
        this.app.use(express.static(publicPath));
    }

    setupNewsListener() {
        // Listen to news from distributor and store in history
        this.newsDistributor.on('news-sent', (newsData) => {
            this.newsHistory.unshift(newsData);

            // Keep only last MAX_HISTORY articles
            if (this.newsHistory.length > this.MAX_HISTORY) {
                this.newsHistory = this.newsHistory.slice(0, this.MAX_HISTORY);
            }
        });
    }

    setupRoutes() {
        // API endpoint for statistics
        this.app.get('/api/stats', (req, res) => {
            res.json({
                totalSent: this.feedMonitor.totalSent,
                activeFeeds: this.feedMonitor.getActiveFeedsCount(),
                totalFeeds: this.rssFeeds.length,
                webClients: this.newsDistributor.stats.webClients,
                feedCounter: Object.fromEntries(this.feedMonitor.feedCounter),
                lastNews: this.newsDistributor.stats.lastNews
            });
        });

        // API endpoint for feed list
        this.app.get('/api/feeds', (req, res) => {
            const feedsWithStatus = this.rssFeeds.map(url => ({
                url,
                name: this.feedMonitor.getFeedName(url),
                errors: this.feedMonitor.errorCount.get(url) || 0,
                active: (this.feedMonitor.errorCount.get(url) || 0) < this.feedMonitor.maxErrors
            }));
            res.json(feedsWithStatus);
        });

        // API endpoint for news history with pagination
        this.app.get('/api/news', (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const offset = (page - 1) * limit;

            const paginatedNews = this.newsHistory.slice(offset, offset + limit);

            res.json({
                news: paginatedNews,
                total: this.newsHistory.length,
                page: page,
                limit: limit,
                totalPages: Math.ceil(this.newsHistory.length / limit)
            });
        });

        // API endpoint to get all news history (for initial load)
        this.app.get('/api/news/all', (req, res) => {
            res.json({
                news: this.newsHistory,
                total: this.newsHistory.length
            });
        });

        // Serve main page
        this.app.get('/', (req, res) => {
            const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
            res.sendFile(indexPath);
        });
    }

    setupWebSocket() {
        this.io.on('connection', (socket) => {
            console.log(`🌐 Web client connected: ${socket.id}`);

            // Register client with news distributor
            this.newsDistributor.addWebClient(socket);

            // Send initial stats
            socket.emit('stats', {
                totalSent: this.feedMonitor.totalSent,
                activeFeeds: this.feedMonitor.getActiveFeedsCount(),
                totalFeeds: this.rssFeeds.length,
                webClients: this.newsDistributor.stats.webClients
            });

            // Send news history to new client
            // Send news history on connection
            const history = this.newsDistributor.persistentStorage
                ? this.newsDistributor.persistentStorage.getHistory()
                : [];

            socket.emit('news-history', {
                total: history.length,
                news: history
            });

            socket.on('disconnect', () => {
                console.log(`🌐 Web client disconnected: ${socket.id}`);
            });
        });

        // Update stats every 5 seconds
        setInterval(() => {
            this.io.emit('stats', {
                totalSent: this.feedMonitor.totalSent,
                activeFeeds: this.feedMonitor.getActiveFeedsCount(),
                totalFeeds: this.rssFeeds.length,
                webClients: this.newsDistributor.stats.webClients
            });
        }, 5000);
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`\nWeb server running at http://localhost:${this.port}`);
            console.log(`WebSocket ready for real-time updates`);
            console.log(`News history capacity: ${this.MAX_HISTORY} articles\n`);
        });
    }
}

module.exports = { WebServer };