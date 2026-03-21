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
        initData: string;          // raw URL-encoded init data string
        initDataUnsafe: {          // already-parsed (client-side only, don't trust without server verification)
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
        ready(): void;             // tell Telegram the app is ready (hides loading spinner)
        expand(): void;            // expand to full height
        close(): void;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        version: string;
      };
    };
  }
}

/** Returns true when the app is running inside a Telegram Mini App context. */
export function isTelegramMiniApp(): boolean {
  // Must be web AND the SDK must be loaded AND initData must be non-empty
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
