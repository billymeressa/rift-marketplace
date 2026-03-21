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

function HeaderTitle() {
  return (
    <Text style={headerStyles.title}>Nile Xport</Text>
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
  title: {
    fontWeight: '700',
    fontSize: 18,
    color: '#1a1a1a',
  },
  right: {
    paddingRight: 16,
  },
});

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
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

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
          : { borderTopColor: '#eee', paddingBottom: Math.max(insets.bottom, 8), height: 54 + Math.max(insets.bottom, 8) },
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
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('tabs.create'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
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
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
