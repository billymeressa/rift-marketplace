/**
 * Telegram Mini App (TMA) helpers.
 *
 * The Telegram Web App SDK is injected via a <script> tag in +html.tsx and
 * attaches itself to `window.Telegram.WebApp`. This module provides typed
 * wrappers so the rest of the app can use it without unsafe `any` casts.
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          auth_date: number;
          hash: string;
        };
        ready(): void;
        expand(): void;
        close(): void;
        requestContact(callback: (sent: boolean, event?: { responseUnsafe?: { contact?: { phone_number: string; first_name: string; user_id: number } } }) => void): void;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        version: string;
      };
    };
  }
}

/** Returns true when the app is running inside a Telegram Mini App context. */
export function isTelegramMiniApp(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.Telegram?.WebApp?.initData &&
    window.Telegram.WebApp.initData.length > 0
  );
}

/** Raw initData string. Empty string when not in TMA context. */
export function getTelegramInitData(): string {
  if (typeof window === 'undefined') return '';
  return window.Telegram?.WebApp?.initData ?? '';
}

/** Parsed user from initDataUnsafe. Only use for display — always verify server-side. */
export function getTelegramUser() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}

/** Call once the React app has mounted to hide Telegram's loading indicator. */
export function telegramReady() {
  if (typeof window === 'undefined') return;
  window.Telegram?.WebApp?.ready();
  window.Telegram?.WebApp?.expand();
}

/**
 * Request the user's verified phone number via Telegram's native dialog.
 * Returns the phone number string (e.g. "+251911234567") or null if cancelled.
 * The phone comes directly from Telegram — it's the one linked to their account.
 */
export function requestContact(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.Telegram?.WebApp?.requestContact) {
      resolve(null);
      return;
    }
    window.Telegram.WebApp.requestContact((sent, event) => {
      if (!sent) {
        resolve(null);
        return;
      }
      const phone = event?.responseUnsafe?.contact?.phone_number;
      if (phone) {
        resolve(phone.startsWith('+') ? phone : '+' + phone);
      } else {
        // User shared but response not available in this API version —
        // the webhook will handle it instead
        resolve('shared');
      }
    });
  });
}
