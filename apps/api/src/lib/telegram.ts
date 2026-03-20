const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendTelegramMessage(chatId: number | string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      console.error('Telegram sendMessage error:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Telegram sendMessage failed:', err);
    return false;
  }
}

export async function setWebhook(url: string): Promise<void> {
  try {
    const res = await fetch(`${API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, allowed_updates: ['message'] }),
    });
    const data = await res.json();
    console.log('Telegram webhook set:', data.ok ? 'success' : data.description);
  } catch (err) {
    console.error('Failed to set Telegram webhook:', err);
  }
}

export async function getBotUsername(): Promise<string> {
  try {
    const res = await fetch(`${API}/getMe`);
    const data = await res.json();
    return data.result?.username || '';
  } catch {
    return '';
  }
}

export function getTelegramDeepLink(botUsername: string, session: string): string {
  return `https://t.me/${botUsername}?start=${session}`;
}
