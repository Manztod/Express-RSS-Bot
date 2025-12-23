const TelegramBot = require('node-telegram-bot-api');
const { logSuccess, logError } = require('../utils/logger');

class TelegramSender {
    constructor(token, chatId) {
        this.bot = new TelegramBot(token, { polling: true });
        this.chatId = chatId;
        this.votes = new Map();

        // Sistem like/dislike
        this.bot.on('callback_query', async (query) => {
            try {
                const { message, data, from } = query;
                if (!message || !data) return;

                const key = `${message.chat.id}_${message.message_id}`;
                let info = this.votes.get(key) || { likes: 0, dislikes: 0, users: new Set() };

                if (info.users.has(from.id)) {
                    await this.bot.answerCallbackQuery(query.id, {
                        text: 'Anda sudah memberikan penilaian sebelumnya.',
                        show_alert: true
                    });
                    return;
                }

                if (data === 'like') info.likes++;
                if (data === 'dislike') info.dislikes++;
                info.users.add(from.id);
                this.votes.set(key, info);

                const keyboard = [
                    [
                        { text: `👍 ${info.likes}`, callback_data: 'like' },
                        { text: `👎 ${info.dislikes}`, callback_data: 'dislike' }
                    ],
                    [{ text: 'Baca Selengkapnya', url: message.reply_markup.inline_keyboard[1][0].url }]
                ];

                await this.bot.editMessageReplyMarkup(
                    { inline_keyboard: keyboard },
                    { chat_id: message.chat.id, message_id: message.message_id }
                );

                await this.bot.answerCallbackQuery(query.id, { text: 'Terima kasih atas tanggapan Anda.' });
            } catch (err) {
                console.error('Error callback:', err.message);
            }
        });
    }

    escape(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async sendNews(item, sourceName, thumb, desc) {
        const title = this.escape(item.title || 'Tanpa Judul');
        const link = item.link || '';

        const dateOnly = new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Jakarta'
        });

        // Format caption
        const caption =
            `<b>${title}</b>

<b>Tanggal:</b> ${dateOnly}
<b>Sumber:</b> ${this.escape(sourceName)}

${desc ? `<b>Deskripsi:</b>\n${this.escape(desc)}\n\n` : ''}──────────────────────────────
<b>Baca selengkapnya di bawah ini</b>`;

        const reply_markup = {
            inline_keyboard: [
                [
                    { text: '👍 0', callback_data: 'like' },
                    { text: '👎 0', callback_data: 'dislike' }
                ],
                [{ text: 'Baca Selengkapnya', url: link }]
            ]
        };

        const sendText = () =>
            this.bot.sendMessage(this.chatId, caption, { parse_mode: 'HTML', reply_markup });

        try {
            // Kirim berita dengan gambar jika ada
            if (thumb && /^https?:\/\//i.test(thumb) && /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(thumb)) {
                await this.bot.sendPhoto(this.chatId, thumb, {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup
                });
            } else {
                await sendText();
            }

            logSuccess(sourceName, item.title || '');
            return true;
        } catch (err) {
            logError(`BadRequest saat kirim berita: ${(item.title || '').slice(0, 40)}`, err);
            try {
                await sendText();
                logSuccess(sourceName, `${item.title || ''} (fallback)`);
                return true;
            } catch (e2) {
                logError('Fallback gagal juga', e2);
                return false;
            }
        }
    }
}

module.exports = { TelegramSender };
