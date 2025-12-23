// Initialize Socket.IO connection
const socket = io();

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const themeToggle = document.getElementById('themeToggle');
const activeFeedsEl = document.getElementById('activeFeeds');
const totalSentEl = document.getElementById('totalSent');
const webClientsEl = document.getElementById('webClients');
const newsGrid = document.getElementById('newsGrid');
const paginationEl = document.getElementById('pagination');
const heroSection = document.getElementById('heroSection');
const tickerItems = document.getElementById('tickerItems');
const trendingList = document.getElementById('trendingList');

// App State
let newsItems = [];
const MAX_NEWS_STORAGE = 1000;
let isRendering = false;
let currentPage = 1;
const ITEMS_PER_PAGE = 12; // Grid items per page

// Slider State
let heroIndex = 0;
let heroInterval = null;

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}
initTheme();

// Connection Status Management
function updateConnectionStatus(status) {
    if (!connectionStatus) return;
    connectionStatus.className = `connection-status ${status}`;
}

// Socket Event Handlers
socket.on('connect', () => {
    updateConnectionStatus('connected');
});

socket.on('disconnect', () => {
    updateConnectionStatus('disconnected');
});

socket.on('stats', (data) => {
    updateStats(data);
});

socket.on('news', (newsData) => {
    addNewsItem(newsData);
    if (newsItems.length <= 5) renderHero();
});

socket.on('news-history', (data) => {
    newsItems = data.news || [];
    renderAll();
    startHeroSlider();
});

// Update Statistics
function updateStats(stats) {
    if (activeFeedsEl) activeFeedsEl.textContent = stats.activeFeeds || 0;
    if (totalSentEl) totalSentEl.textContent = stats.totalSent || 0;
    if (webClientsEl) webClientsEl.textContent = stats.webClients || 0;
}

// Add News Item to Array
function addNewsItem(newsData) {
    const exists = newsItems.some(item =>
        item.link === newsData.link || item.title === newsData.title
    );
    if (exists) return;

    newsItems.unshift(newsData);
    if (newsItems.length > MAX_NEWS_STORAGE) {
        newsItems = newsItems.slice(0, MAX_NEWS_STORAGE);
    }
    renderAll();
}

// Render Everything
function renderAll() {
    if (isRendering) return;
    isRendering = true;

    try {
        renderTicker();
        renderHero();
        renderGrid();
        renderTrending();
    } catch (e) {
        console.error('Render error:', e);
    } finally {
        isRendering = false;
    }
}

// 1. Render Ticker
function renderTicker() {
    if (!tickerItems) return;
    const items = newsItems.slice(0, 10);
    if (items.length === 0) return;

    const html = items.map(item => `
        <span class="ticker-item">• ${escapeHtml(item.title)}</span>
    `).join(' &nbsp;&nbsp;&nbsp;&nbsp; ');

    tickerItems.innerHTML = html;
}

// 2. Render Hero Slider (Animated)
function renderHero() {
    if (!heroSection) return;
    if (newsItems.length === 0) {
        heroSection.innerHTML = '';
        heroSection.style.display = 'none';
        return;
    }

    heroSection.style.display = 'block';
    const sliderItems = newsItems.slice(0, 5);

    // Create Wrapper for horizontal sliding
    let slidesHtml = sliderItems.map((hero, idx) => {
        const thumbnail = hero.thumbnail || 'https://via.placeholder.com/800x450?text=News+Update';
        return `
            <div class="hero-main-card" id="heroCard_${idx}" onclick="window.open('${escapeHtml(hero.link)}', '_blank')">
                <img src="${escapeHtml(thumbnail)}" alt="Hero" draggable="false">
                <div class="hero-overlay">
                    <span class="hero-category">HEADLINE</span>
                    <span class="news-source-badge">${escapeHtml(hero.source || 'RSS')}</span>
                    <h1 class="hero-title">${escapeHtml(hero.title)}</h1>
                    <p class="news-time">${getTimeAgo(hero.pubDate)}</p>
                </div>
            </div>
        `;
    }).join('');

    heroSection.innerHTML = `
        <div class="hero-wrapper" id="heroWrapper">
            ${slidesHtml}
        </div>
        
        <div class="slider-nav-btn slider-prev-btn" onclick="event.stopPropagation(); changeHeroByOffset(-1)"></div>
        <div class="slider-nav-btn slider-next-btn" onclick="event.stopPropagation(); changeHeroByOffset(1)"></div>

        <div class="hero-dots" id="heroDots">
            ${sliderItems.map((_, idx) => `
                <div class="dot ${idx === heroIndex ? 'active' : ''}" onclick="event.stopPropagation(); changeHero(${idx})"></div>
            `).join('')}
        </div>
    `;

    updateSliderPosition();
    initSwipe();
}

window.changeHeroByOffset = function (offset) {
    const sliderCount = Math.min(newsItems.length, 5);
    if (sliderCount === 0) return;
    let newIndex = (heroIndex + offset) % sliderCount;
    if (newIndex < 0) newIndex = sliderCount - 1;
    changeHero(newIndex);
};

function updateSliderPosition() {
    const wrapper = document.getElementById('heroWrapper');
    if (!wrapper) return;
    wrapper.style.transform = `translateX(-${heroIndex * 100}%)`;

    // Update dots
    const dots = document.querySelectorAll('.hero-dots .dot');
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === heroIndex);
    });
}

// Swipe / Drag Logic
let dragStartX = 0;
let isDragging = false;

function initSwipe() {
    const section = heroSection;
    if (!section) return;

    // Mouse Events
    section.addEventListener('mousedown', (e) => {
        dragStartX = e.pageX;
        isDragging = true;
        section.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
    });

    window.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        section.style.cursor = 'grab';
        handleSwipeEnd(e.pageX);
    });

    // Touch Events
    section.addEventListener('touchstart', (e) => {
        dragStartX = e.touches[0].pageX;
        isDragging = true;
    }, { passive: true });

    section.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        handleSwipeEnd(e.changedTouches[0].pageX);
    }, { passive: true });
}

function handleSwipeEnd(endX) {
    const threshold = 50;
    const diff = dragStartX - endX;

    if (Math.abs(diff) > threshold) {
        const sliderCount = Math.min(newsItems.length, 5);
        if (diff > 0) {
            // Swipe Left -> Next
            changeHero((heroIndex + 1) % sliderCount);
        } else {
            // Swipe Right -> Prev
            changeHero((heroIndex - 1 + sliderCount) % sliderCount);
        }
    }
}

function startHeroSlider() {
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        if (newsItems.length > 1) {
            heroIndex = (heroIndex + 1) % Math.min(newsItems.length, 5);
            updateSliderPosition();
        }
    }, 5000);
}

window.changeHero = function (idx) {
    heroIndex = idx;
    updateSliderPosition();
    startHeroSlider();
};

// 3. Render Grid
function renderGrid() {
    if (!newsGrid) return;

    // Always skip first 5 items (slider)
    let startIndex = 5 + (currentPage - 1) * ITEMS_PER_PAGE;
    let endIndex = startIndex + ITEMS_PER_PAGE;

    const gridItems = newsItems.slice(startIndex, endIndex);

    if (gridItems.length === 0 && currentPage === 1) {
        newsGrid.innerHTML = '<p class="empty-msg">Belum ada berita lainnya...</p>';
        return;
    }

    newsGrid.innerHTML = gridItems.map(news => `
        <article class="news-card">
            <div class="news-img-wrapper" onclick="window.open('${escapeHtml(news.link)}', '_blank')">
                <img src="${escapeHtml(news.thumbnail || 'https://via.placeholder.com/400x200?text=No+Image')}" 
                     onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
                <span class="news-source-badge">${escapeHtml(news.source || 'RSS')}</span>
            </div>
            <div class="news-body">
                <span class="news-time">${getTimeAgo(news.pubDate)}</span>
                <a href="${escapeHtml(news.link)}" target="_blank" class="news-title">${escapeHtml(news.title)}</a>
                <p class="news-desc">${escapeHtml(news.description || '').substring(0, 100)}...</p>
            </div>
        </article>
    `).join('');

    renderPagination();
}

// 4. Render Pagination
function renderPagination() {
    if (!paginationEl) return;

    const ITEMS_PER_PAGE = 12;
    const totalItems = newsItems.length;
    const itemsAfterSlider = Math.max(0, totalItems - 5);
    const totalPages = itemsAfterSlider > 0 ? Math.ceil(itemsAfterSlider / ITEMS_PER_PAGE) : 0;

    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Prev</button>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next</button>`;
    paginationEl.innerHTML = html;
}

window.changePage = function (page) {
    currentPage = page;
    renderAll();
    window.scrollTo({ top: 400, behavior: 'smooth' });
};

// 5. Render Trending
function renderTrending() {
    if (!trendingList) return;
    const trending = newsItems.slice(0, 10);

    if (trending.length === 0) {
        trendingList.innerHTML = '<p>Menunggu data...</p>';
        return;
    }

    trendingList.innerHTML = trending.map((item, idx) => `
        <div class="trending-item">
            <span class="trending-num">${(idx + 1).toString().padStart(2, '0')}</span>
            <div class="trending-content">
                <a href="${escapeHtml(item.link)}" target="_blank" style="text-decoration:none; color:inherit;">
                    <h4>${escapeHtml(item.title)}</h4>
                </a>
                <span class="news-time">${getTimeAgo(item.pubDate)} | ${item.source || 'RSS'}</span>
            </div>
        </div>
    `).join('');
}

// Helpers
function getTimeAgo(dateString) {
    if (!dateString) return 'Baru saja';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        if (seconds < 60) return 'Baru saja';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m lalu`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}j lalu`;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch (e) { return 'Beberapa saat lalu'; }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

setInterval(() => {
    if (newsItems.length > 0) renderAll();
}, 60000);

console.log('🚀 Red News Portal UI Initialized');