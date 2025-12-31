# Express-RSS-Bot

Bot Telegram yang efisien untuk memantau RSS Feed dari berbagai media berita Indonesia dan mengirimkan pembaruan secara real-time ke grup atau channel Telegram Anda.

## 🚀 Fitur Utama

- **Real-time Monitoring**: Memantau puluhan RSS feed berita populer Indonesia.
- **Fast & Lightweight**: Dibangun dengan Node.js untuk performa yang cepat.
- **Dashboard Web**: Dilengkapi dengan interface web sederhana (Socket.io) untuk memantau aktivitas bot.
- **Dukungan Docker**: Siap untuk dideploy menggunakan Docker.
- **Filter Berita Terbaru**: Hanya mengirimkan berita yang dipublikasikan dalam beberapa menit terakhir (default: 5 menit).

## 📋 Prasyarat

Sebelum memulai, pastikan Anda telah memiliki:
- **Node.js** (v16 atau lebih baru)
- **Telegram Bot Token**: Dapatkan dari [@BotFather](https://t.me/botfather).
- **Chat ID**: ID group atau channel tempat bot akan mengirim pesan.

## ⚙️ Instalasi

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/Manztod/Express-RSS-Bot/tree/main
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment:**
   Buat file `.env` di direktori root dan tambahkan konfigurasi berikut:
   ```env
   TELEGRAM_TOKEN=your_bot_token_here
   CHAT_ID=your_chat_id_here
   PORT=3000
   ```

## 🚀 Menjalankan Bot

### Mode Pengembangan (Development)
Menggunakan `nodemon` untuk restart otomatis saat ada perubahan kode:
```bash
npm run dev
```

### Mode Produksi (Production)
```bash
npm start
```

## 🐳 Menggunakan Docker

Anda juga dapat menjalankan bot ini menggunakan Docker:

1. **Build Image:**
   ```bash
   docker build -t telegram-rss-bot .
   ```

2. **Jalankan Container:**
   ```bash
   docker run -d --env-file .env name telegram-rss-bot telegram-rss-bot
   ```

## 📊 Dashboard Web

Setelah bot berjalan, Anda dapat mengakses dashboard pemantauan melalui browser di:
`http://localhost:3000` (atau port yang Anda tentukan di `.env`).

## 🗞️ Daftar RSS Feed

Bot ini secara default dikonfigurasi untuk memantau berbagai media berita ternama seperti:
- Tribunnews (Banyak region)
- Detik.com
- Tempo.co
- Antaranews
- CNBC Indonesia
- CNN Indonesia
- Republika
- Dan banyak lagi (Lihat `src/config.js` untuk daftar lengkap).

## 🛠️ Konfigurasi Lanjutan

Anda dapat menyesuaikan parameter bot di file `src/config.js`:
- `RECENT_MINUTES`: Rentang waktu berita yang akan diambil.
- `CONCURRENCY`: Jumlah fetch paralel (jangan terlalu tinggi agar tidak diblokir).
- `MAX_ERRORS`: Batas error sebelum feed di-skip sementara.

---
