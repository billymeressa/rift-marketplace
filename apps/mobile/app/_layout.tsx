import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { AuthContext } from '../lib/auth';
import { getToken, getUser, saveToken, saveUser, removeToken, removeUser } from '../lib/auth';
import { setUnauthorizedHandler, api } from '../lib/api';
import { registerForPushNotifications } from '../lib/notifications';
import { isTelegramMiniApp, getTelegramInitData, telegramReady } from '../lib/telegram-webapp';

// Screens where the TMA back button should be hidden (user is at a root screen)
const ROOT_SEGMENTS = ['(tabs)', '(auth)'];
import '../lib/i18n';
import { initSentry } from '../lib/sentry';
initSentry();

export { ErrorBoundary } from 'expo-router';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

export default function RootLayout() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Tell Telegram the WebView is ready immediately (removes Telegram's own loader)
  useEffect(() => {
    if (Platform.OS === 'web' && isTelegramMiniApp()) {
      telegramReady();
    }
  }, []);

  // ── Global TMA back button manager ─────────────────────────────────────────
  // Show the Telegram back button on any non-root screen; hide it on root tabs
  // and auth screens. This prevents Telegram from closing the app when the user
  // presses the hardware/swipe back gesture.
  useEffect(() => {
    if (Platform.OS !== 'web' || !isTelegramMiniApp()) return;
    const btn = window.Telegram?.WebApp?.BackButton;
    if (!btn) return;

    const isRootScreen = !segments[0] || ROOT_SEGMENTS.includes(segments[0] as string);

    if (isRootScreen) {
      btn.hide();
    } else {
      btn.show();
      const handleBack = () => router.back();
      btn.onClick(handleBack);
      return () => btn.offClick(handleBack);
    }
  }, [segments]);

  useEffect(() => {
    (async () => {
      // ── Telegram Mini App: auto-login via initData ──────────────────────────
      if (Platform.OS === 'web' && isTelegramMiniApp()) {
        try {
          const initData = getTelegramInitData();
          const result = await api.telegramMiniAppLogin(initData);
          if (!result.isNewUser && result.token && result.user) {
            await saveToken(result.token);
            await saveUser(result.user);
            setToken(result.token);
            setUser(result.user);
            setIsLoading(false);
            return; // existing user — logged in immediately
          }
          // New user — fall through so login screen shows the profile form
        } catch (err) {
          console.warn('TMA auto-login failed, falling back to normal auth:', err);
        }
      }

      // ── Normal flow: restore token from storage ─────────────────────────────
      const savedToken = await getToken();
      const savedUser = await getUser();
      setToken(savedToken);
      setUser(savedUser);
      setIsLoading(false);
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync();
      }
    })();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, segments, isLoading]);

  const signIn = useCallback(async (newToken: string, newUser: any) => {
    await saveToken(newToken);
    await saveUser(newUser);
    setToken(newToken);
    setUser(newUser);
    // Register for push notifications after login
    registerForPushNotifications()
      .then(pushToken => {
        if (pushToken) api.savePushToken(pushToken).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    await removeToken();
    await removeUser();
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  // Register global handler so apiRequest can trigger sign-out on 401
  useEffect(() => {
    setUnauthorizedHandler(signOut);
  }, [signOut]);

  if (isLoading) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ token, user, isLoading, signIn, signOut }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="listing/[id]"
            options={{ headerShown: true, title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="listing/edit/[id]"
            options={{ headerShown: true, title: 'Edit Listing', presentation: 'card' }}
          />
          <Stack.Screen
            name="order/create"
            options={{ headerShown: true, title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="order/[id]"
            options={{ headerShown: true, title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="verification"
            options={{ headerShown: true, title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="deposit-verification"
            options={{ headerShown: true, title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="user/[id]"
            options={{ headerShown: true, title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="review/create"
            options={{ headerShown: true, title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="chat/[id]"
            options={{ headerShown: true, title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="message-compose"
            options={{ headerShown: true, title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="feedback"
            options={{ headerShown: true, title: 'Send Feedback', presentation: 'modal' }}
          />
        </Stack>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
