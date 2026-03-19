import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Rift — Ethiopia's Coffee & Agriculture Marketplace</title>
        <meta name="description" content="Buy and sell coffee, sesame, and agricultural products across Ethiopia. Connect with verified traders on Rift." />
        <meta property="og:title" content="Rift — Ethiopia's Coffee & Agriculture Marketplace" />
        <meta property="og:description" content="Buy and sell coffee, sesame, and agricultural products across Ethiopia." />
        <meta property="og:type" content="website" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
