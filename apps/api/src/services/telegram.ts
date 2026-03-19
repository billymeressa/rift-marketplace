import { db } from '../db/client.js';
import { telegramRegistrations } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { normalizePhone } from './otp.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage failed: ${err}`);
  }
}

export async function getChatIdByPhone(phone: string): Promise<string | null> {
  const [reg] = await db
    .select()
    .from(telegramRegistrations)
    .where(eq(telegramRegistrations.phone, phone))
    .limit(1);
  return reg?.chatId ?? null;
}

export async function handleTelegramUpdate(update: any): Promise<void> {
  const message = update.message;
  if (!message) return;

  const chatId = String(message.chat.id);
  const text = message.text ?? '';

  // User shared their phone via the contact button
  if (message.contact) {
    let phone = message.contact.phone_number;
    if (!phone.startsWith('+')) phone = '+' + phone;
    phone = normalizePhone(phone);

    await db
      .insert(telegramRegistrations)
      .values({ phone, chatId })
      .onConflictDoUpdate({
        target: telegramRegistrations.phone,
        set: { chatId },
      });

    await sendTelegramMessage(chatId,
      '✅ Phone registered! You can now sign up on the Rift app and receive your verification code here.'
    );
    return;
  }

  // /start command — prompt them to share phone
  if (text === '/start') {
    await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Welcome to Rift! 🌱\n\nTap the button below to share your phone number so we can send you verification codes.',
        reply_markup: {
          keyboard: [[{ text: '📱 Share Phone Number', request_contact: true }]],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      }),
    });
    return;
  }

  await sendTelegramMessage(chatId, 'Tap /start to register your phone number.');
}
