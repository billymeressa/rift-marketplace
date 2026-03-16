import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return; // skip in local dev if DSN not set

  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV || 'development',
    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: 0.2, // 20% of transactions for performance monitoring
    beforeSend(event) {
      // Strip any PII from events
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

export { Sentry };
