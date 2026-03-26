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

// ─── Header ──────────────────────────────────────────────────────────────────

function HeaderTitle() {
  return (
    <View style={headerStyles.titleRow}>
      <Text style={headerStyles.title}>Nile</Text>
      <Text style={headerStyles.titleAccent}>Xport</Text>
    </View>
  );
}

function HeaderRight() {
  return (
    <View style={headerStyles.right}>
      <LanguageToggle />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  title: { fontWeight: '800', fontSize: 18, color: '#1A1D21', letterSpacing: -0.3 },
  titleAccent: { fontWeight: '800', fontSize: 18, color: '#1B4332', letterSpacing: -0.3 },
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
    backgroundColor: '#DC2626',
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
        <Ionicons name="add" size={28} color="#fff" />
      </View>
    </View>
  );
}

const fabStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -14,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1B4332',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'am' | 'om';
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

  const tabBarHeight = 56 + Math.max(insets.bottom, 8);
  const isTMA = Platform.OS === 'web' && isTelegramMiniApp();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1B4332',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: !isTMA,
        tabBarStyle: Platform.OS === 'web'
          ? {
              borderTopColor: '#E5E7EB',
              borderTopWidth: 1,
              paddingBottom: 8,
              height: 56,
              overflow: 'visible',
              backgroundColor: '#FFFFFF',
              ...(isMobile ? {} : {
                maxWidth: 1200,
                alignSelf: 'center' as any,
                width: '100%' as any,
                borderTopWidth: 0,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
              }),
            }
          : {
              borderTopColor: '#E5E7EB',
              paddingBottom: Math.max(insets.bottom, 8),
              height: tabBarHeight,
              overflow: 'visible',
              backgroundColor: '#FFFFFF',
            },
        tabBarLabelStyle: {
          fontSize: isMobile ? 11 : 12,
          fontWeight: '500',
        },
        headerTitle: () => <HeaderTitle />,
        headerRight: () => <HeaderRight />,
        headerStyle: {
          backgroundColor: '#FFFFFF',
          ...(Platform.OS === 'web' && !isMobile
            ? {
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
                shadowOpacity: 0,
                elevation: 0,
              }
            : {}),
        },
      }}
    >
      {/* 1 — Marketplace */}
      <Tabs.Screen
        name="index"
        options={{
          title: lang === 'am' ? 'ገበያ' : lang === 'om' ? 'Gabaa' : 'Market',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 2 — Orders */}
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 3 — Post (centre FAB) */}
      <Tabs.Screen
        name="create"
        options={{
          title: lang === 'am' ? 'ዝርዝር' : lang === 'om' ? 'Tarree' : 'List',
          tabBarLabel: () => null,
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

      {/* Hidden — search is inline on the home screen */}
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}

