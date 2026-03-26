import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import LanguageToggle from '../../components/LanguageToggle';
import { useResponsive } from '../../hooks/useResponsive';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { isTelegramMiniApp } from '../../lib/telegram-webapp';
import { getTMATheme } from '../../lib/telegram-theme';

// ─── Header (non-TMA only) ─────────────────────────────────────────────────

function HeaderTitle() {
  return <Text style={headerStyles.title}>Nile Xport</Text>;
}

function HeaderRight() {
  return (
    <View style={headerStyles.right}>
      <LanguageToggle />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  title: { fontWeight: '700', fontSize: 18, color: '#1a1a1a' },
  right: { paddingRight: 16 },
});

// ─── Unread badge ───────────────────────────────────────────────────────────

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

// ─── Centre FAB (Post button) ───────────────────────────────────────────────

function PostIcon({ isTMA }: { isTMA: boolean }) {
  const size = isTMA ? 48 : 60;
  const iconSize = isTMA ? 26 : 32;
  const theme = isTMA ? getTMATheme() : null;

  return (
    <View style={[fabStyles.wrapper, isTMA && { top: -10 }]}>
      <View style={[
        fabStyles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme?.button || '#2E7D32',
          borderWidth: isTMA ? 2.5 : 3,
          borderColor: theme?.bg || '#fff',
        },
        isTMA && {
          shadowColor: theme?.button || '#2E7D32',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
        },
      ]}>
        <Ionicons name="add" size={iconSize} color={theme?.buttonText || '#fff'} />
      </View>
    </View>
  );
}

const fabStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -16,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
});

// ─── Layout ─────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isMobile } = useResponsive();
  const { token } = useAuth();

  const { data: unreadData } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => api.getUnreadCount(),
    refetchInterval: 15000,
    enabled: !!token,
  });
  const unreadCount = unreadData?.count ?? 0;

  const isTMA = Platform.OS === 'web' && isTelegramMiniApp();
  const theme = isTMA ? getTMATheme() : null;

  // TMA: compact 50px tab bar, no bottom padding (Telegram handles safe area)
  // Native: standard height with safe area insets
  const tabBarHeight = isTMA ? 50 : 58 + Math.max(insets.bottom, 8);

  const tmaTabBarStyle = {
    height: 50,
    paddingBottom: 0,
    paddingTop: 4,
    backgroundColor: theme?.bg || '#fff',
    borderTopWidth: 0.5,
    borderTopColor: theme?.separator || 'rgba(0,0,0,0.08)',
    overflow: 'visible' as const,
  };

  const webTabBarStyle = {
    borderTopColor: '#eee',
    paddingBottom: 8,
    height: 60,
    overflow: 'visible' as const,
    ...(isMobile ? {} : {
      maxWidth: 1200,
      alignSelf: 'center' as any,
      width: '100%' as any,
      borderTopWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    }),
  };

  const nativeTabBarStyle = {
    borderTopColor: '#eee',
    paddingBottom: Math.max(insets.bottom, 8),
    height: tabBarHeight,
    overflow: 'visible' as const,
  };

  const tabBarStyle = isTMA
    ? tmaTabBarStyle
    : Platform.OS === 'web'
      ? webTabBarStyle
      : nativeTabBarStyle;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isTMA ? (theme?.accent || '#2E7D32') : '#2E7D32',
        tabBarInactiveTintColor: isTMA ? (theme?.hint || '#8e8e93') : '#999',
        headerShown: !isTMA,
        tabBarStyle: tabBarStyle as any,
        // TMA: hide labels for a cleaner, compact look
        tabBarShowLabel: isTMA ? false : (isMobile ? true : true),
        tabBarLabelStyle: isTMA ? { display: 'none' as any } : (isMobile ? undefined : { fontSize: 13 }),
        tabBarIconStyle: isTMA ? { marginTop: 2 } : undefined,
        headerTitle: () => <HeaderTitle />,
        headerRight: () => <HeaderRight />,
        headerStyle: Platform.OS === 'web' && !isMobile
          ? {
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
              shadowOpacity: 0,
              elevation: 0,
            }
          : undefined,
      }}
    >
      {/* 1 — Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={isTMA ? 24 : 25}
              color={color}
            />
          ),
        }}
      />

      {/* 2 — Orders */}
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={isTMA ? 22 : 25}
              color={color}
            />
          ),
        }}
      />

      {/* 3 — Post (centre FAB) */}
      <Tabs.Screen
        name="create"
        options={{
          title: t('tabs.create'),
          tabBarLabel: () => null,
          tabBarIcon: () => <PostIcon isTMA={isTMA} />,
          tabBarItemStyle: { overflow: 'visible' },
        }}
      />

      {/* 4 — Messages */}
      <Tabs.Screen
        name="messages"
        options={{
          title: t('messages.title'),
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? 'chatbubble' : 'chatbubble-outline'}
                size={isTMA ? 22 : 25}
                color={color}
              />
              <UnreadBadge count={unreadCount} />
            </View>
          ),
        }}
      />

      {/* 5 — Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={isTMA ? 22 : 25}
              color={color}
            />
          ),
        }}
      />

      {/* Hidden — search is now inline on the home screen */}
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
