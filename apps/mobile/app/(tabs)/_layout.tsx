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

// ─── Header ──────────────────────────────────────────────────────────────────

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

// ─── Unread badge ─────────────────────────────────────────────────────────────

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

// ─── Centre FAB (Post button) ─────────────────────────────────────────────────

function PostIcon() {
  return (
    <View style={fabStyles.wrapper}>
      <View style={fabStyles.circle}>
        <Ionicons name="add" size={32} color="#fff" />
      </View>
    </View>
  );
}

const fabStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    // lift the circle above the tab bar
    top: -16,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    // white ring separates the circle from the tab bar
    borderWidth: 3,
    borderColor: '#fff',
    // shadow
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
});

// ─── Layout ───────────────────────────────────────────────────────────────────

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

  const tabBarHeight = 58 + Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: Platform.OS === 'web'
          ? {
              borderTopColor: '#eee',
              paddingBottom: 8,
              height: 60,
              overflow: 'visible',
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
            }
          : {
              borderTopColor: '#eee',
              paddingBottom: Math.max(insets.bottom, 8),
              height: tabBarHeight,
              overflow: 'visible',
            },
        tabBarLabelStyle: isMobile ? undefined : { fontSize: 13 },
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 2 — Markets */}
      <Tabs.Screen
        name="markets"
        options={{
          title: 'Markets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 3 — Orders */}
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 3 — Post (centre FAB) */}
      <Tabs.Screen
        name="create"
        options={{
          title: t('tabs.create'),
          tabBarLabel: () => null,          // no label — the circle speaks for itself
          tabBarIcon: () => <PostIcon />,
          tabBarItemStyle: { overflow: 'visible' },
        }}
      />

      {/* 4 — Messages */}
      <Tabs.Screen
        name="messages"
        options={{
          title: t('messages.title'),
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubble-outline" size={size} color={color} />
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden — search is now inline on the home screen */}
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
