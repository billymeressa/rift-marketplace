import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import ResponsiveContainer from '../../components/ResponsiveContainer';
import { isTelegramMiniApp } from '../../lib/telegram-webapp';
import { getTMATheme } from '../../lib/telegram-theme';

const isTMA = Platform.OS === 'web' && typeof window !== 'undefined' && isTelegramMiniApp();
const theme = isTMA ? getTMATheme() : null;

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function MessagesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    refetchInterval: 15000,
  });

  const conversations = data?.data || [];

  const renderItem = ({ item }: { item: any }) => {
    const isUnread = item.unreadCount > 0;
    const lastMsgIsMe = item.lastMessage?.senderId === user?.id;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isTMA && {
            backgroundColor: theme?.bg,
            borderBottomColor: theme?.separator,
            paddingHorizontal: 14,
            paddingVertical: 12,
          },
          isUnread && (isTMA
            ? { backgroundColor: (theme?.accent || '#2E7D32') + '0A' }
            : styles.unreadItem
          ),
        ]}
        onPress={() => router.push(`/chat/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={[
          styles.avatar,
          isTMA && { width: 44, height: 44, borderRadius: 22, backgroundColor: theme?.accent },
        ]}>
          <Text style={[styles.avatarText, isTMA && { fontSize: 16 }]}>
            {(item.otherUser?.name || '?')[0].toUpperCase()}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text
              style={[
                styles.userName,
                isTMA && { color: theme?.text },
                isUnread && (isTMA ? { fontWeight: '700', color: theme?.text } : styles.unreadText),
              ]}
              numberOfLines={1}
            >
              {item.otherUser?.name || 'Seller'}
            </Text>
            <Text style={[
              styles.timeText,
              isTMA && { color: theme?.hint },
              isUnread && (isTMA ? { color: theme?.accent, fontWeight: '600' } : styles.unreadTime),
            ]}>
              {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ''}
            </Text>
          </View>

          <Text style={[styles.listingContext, isTMA && { color: theme?.hint }]} numberOfLines={1}>
            {item.listingTitle}
          </Text>

          <View style={styles.lastMessageRow}>
            {item.lastMessage ? (
              <Text
                style={[
                  styles.lastMessage,
                  isTMA && { color: theme?.subtitle },
                  isUnread && (isTMA ? { fontWeight: '600', color: theme?.text } : styles.unreadText),
                ]}
                numberOfLines={1}
              >
                {lastMsgIsMe ? `${t('messages.you')}: ` : ''}
                {item.lastMessage.body}
              </Text>
            ) : (
              <Text style={[styles.lastMessage, isTMA && { color: theme?.hint }]} numberOfLines={1}>—</Text>
            )}

            {isUnread && (
              <View style={[styles.badge, isTMA && { backgroundColor: theme?.accent }]}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loader, isTMA && { backgroundColor: theme?.bg }]}>
        <ActivityIndicator size="large" color={isTMA ? theme?.accent : '#2E7D32'} />
      </View>
    );
  }

  return (
    <ResponsiveContainer style={[styles.container, isTMA && { backgroundColor: theme?.bg }]}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={56} color={isTMA ? theme?.separator : '#ccc'} />
            <Text style={[styles.emptyTitle, isTMA && { color: theme?.subtitle }]}>
              {t('messages.noConversations')}
            </Text>
            <Text style={[styles.emptyHint, isTMA && { color: theme?.hint }]}>
              {t('messages.noConversationsHint')}
            </Text>
          </View>
        }
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : [styles.listContent, isTMA && { paddingBottom: 60 }]}
      />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  unreadItem: {
    backgroundColor: '#F1F8F2',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  unreadTime: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  listingContext: {
    fontSize: 12,
    color: '#888',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#666',
  },
  emptyHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
