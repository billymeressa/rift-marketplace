// Read token lazily so it's always picked up from the current process.env
// (avoids the cached-empty-string problem when .env is updated after first load)
const api = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN || ''}`;

export async function sendTelegramMessage(chatId: number | string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${api()}/sendMessage`, {
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
    const res = await fetch(`${api()}/setWebhook`, {
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
  if (!process.env.TELEGRAM_BOT_TOKEN) return '';
  try {
    const res = await fetch(`${api()}/getMe`);
    const data = await res.json();
    return data.result?.username || '';
  } catch {
    return '';
  }
}

export function getTelegramDeepLink(botUsername: string, session: string): string {
  return `https://t.me/${botUsername}?start=${session}`;
}

/**
 * Registers the Mini App URL as the bot's menu button so users see an
 * "Open App" button in every chat with the bot.
 *
 * Call once at server startup when TELEGRAM_MINI_APP_URL is set.
 */
export async function setChatMenuButton(webAppUrl: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    const res = await fetch(`${api()}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Open App',
          web_app: { url: webAppUrl },
        },
      }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log('✅ Telegram menu button registered:', webAppUrl);
    } else {
      console.warn('⚠️  setChatMenuButton failed:', data.description);
    }
  } catch (err) {
    console.error('setChatMenuButton error:', err);
  }
}
