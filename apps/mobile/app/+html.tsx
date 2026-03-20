import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Nile Xchange — Ethiopia's Coffee & Agriculture Marketplace</title>
        <meta name="description" content="Buy and sell coffee, sesame, and agricultural products across Ethiopia. Connect with verified traders on Nile Xchange." />
        <meta property="og:title" content="Nile Xchange — Ethiopia's Coffee & Agriculture Marketplace" />
        <meta property="og:description" content="Buy and sell coffee, sesame, and agricultural products across Ethiopia." />
        <meta property="og:type" content="website" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #root { height: 100dvh; overflow: hidden; }
            * { box-sizing: border-box; }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
