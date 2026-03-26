import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Nile Xport — Ethiopia's Agricultural Export Marketplace</title>
        <meta name="description" content="Connecting Ethiopian producers to global buyers. Trade coffee, sesame, teff and more. Verified sellers, secure transactions." />
        <meta property="og:title" content="Nile Xport — Ethiopia's Agricultural Export Marketplace" />
        <meta property="og:description" content="Connecting Ethiopian producers to global buyers. Trade coffee, sesame, teff and more." />
        <meta property="og:type" content="website" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* Telegram Mini App SDK — must load before the app bundle.
            Uses dangerouslySetInnerHTML because self-closing <script /> tags
            are invalid HTML and get silently ignored by browsers. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Load Telegram Web App SDK synchronously
              var s = document.createElement('script');
              s.src = 'https://telegram.org/js/telegram-web-app.js';
              s.async = false;
              document.head.appendChild(s);
            `,
          }}
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #root {
              height: 100dvh;
              overflow: hidden;
              background-color: #F3F4F6;
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            /* Better scrollbars on desktop */
            ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            ::-webkit-scrollbar-track {
              background: transparent;
            }
            ::-webkit-scrollbar-thumb {
              background: #ccc;
              border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: #aaa;
            }
            /* Smooth transitions */
            a, button { transition: opacity 0.15s ease; }
            /* Remove blue highlight on mobile web taps */
            * { -webkit-tap-highlight-color: transparent; }
            /* Ensure inputs look right on desktop */
            input, textarea {
              outline: none;
              -webkit-appearance: none;
            }
            input:focus, textarea:focus {
              outline: none;
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
