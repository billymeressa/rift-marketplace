import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../lib/auth';
import { getToken, getUser, saveToken, saveUser, removeToken, removeUser } from '../lib/auth';
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

  useEffect(() => {
    (async () => {
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
      router.replace('/(auth)/phone');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, segments, isLoading]);

  const signIn = useCallback(async (newToken: string, newUser: any) => {
    await saveToken(newToken);
    await saveUser(newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const signOut = useCallback(async () => {
    await removeToken();
    await removeUser();
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

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
            name="user/[id]"
            options={{ headerShown: true, title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="review/create"
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
