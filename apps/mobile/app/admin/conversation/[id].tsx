import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../../lib/api';

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminConversationThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'conversation', id],
    queryFn: () => adminApi.getConversation(id!),
    enabled: !!id,
    staleTime: 15_000,
  });

  const conv     = data?.conversation;
  const msgs     = data?.messages ?? [];
  const buyerId  = conv?.buyer?.id;

  // Set header title to participant names once loaded
  useEffect(() => {
    if (conv) {
      navigation.setOptions({
        title: `${conv.buyer?.name ?? '?'} · ${conv.seller?.name ?? '?'}`,
      });
    }
  }, [conv]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  if (!conv) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Conversation not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Conversation info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>BUYER</Text>
          <Text style={styles.infoName}>{conv.buyer?.name ?? '—'}</Text>
          <Text style={styles.infoPhone}>{conv.buyer?.phone}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color="#ccc" />
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>SELLER</Text>
          <Text style={styles.infoName}>{conv.seller?.name ?? '—'}</Text>
          <Text style={styles.infoPhone}>{conv.seller?.phone}</Text>
        </View>
      </View>

      <View style={styles.listingBar}>
        <Ionicons name="pricetag-outline" size={13} color="#1B4332" />
        <Text style={styles.listingTitle} numberOfLines={1}>
          {conv.listing?.title ?? 'Unknown listing'}
        </Text>
      </View>

      {/* Messages — oldest at top (inverted: false) */}
      <FlatList
        data={[...msgs].reverse()}          // oldest first
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.msgList}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No messages</Text>
          </View>
        }
        renderItem={({ item: msg }) => {
          const isBuyer = msg.sender?.id === buyerId;
          return (
            <View style={[styles.msgRow, isBuyer ? styles.msgRowLeft : styles.msgRowRight]}>
              {/* Sender label */}
              <Text style={[styles.senderTag, isBuyer ? styles.senderLeft : styles.senderRight]}>
                {msg.sender?.name ?? 'Unknown'}
              </Text>
              <View style={[styles.bubble, isBuyer ? styles.bubbleLeft : styles.bubbleRight]}>
                <Text style={[styles.msgBody, isBuyer ? styles.msgBodyLeft : styles.msgBodyRight]}>
                  {msg.body}
                </Text>
              </View>
              <Text style={[styles.msgTime, isBuyer ? styles.senderLeft : styles.senderRight]}>
                {formatTime(msg.createdAt)}
                {msg.readAt && (
                  <Text style={styles.readMark}>  ✓✓</Text>
                )}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#9CA3AF' },
  emptyText: { fontSize: 15, color: '#bbb' },

  infoBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1A1D21', paddingHorizontal: 20, paddingVertical: 12,
    gap: 12,
  },
  infoBlock:  { flex: 1 },
  infoLabel:  { fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 1 },
  infoName:   { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
  infoPhone:  { fontSize: 12, color: '#aaa', marginTop: 1 },

  listingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ECFDF5', paddingHorizontal: 16, paddingVertical: 8,
  },
  listingTitle: { fontSize: 13, color: '#1B4332', fontWeight: '600', flex: 1 },

  msgList: { padding: 12, paddingBottom: 32 },

  msgRow:      { marginBottom: 14 },
  msgRowLeft:  { alignItems: 'flex-start' },
  msgRowRight: { alignItems: 'flex-end' },

  senderTag:   { fontSize: 11, fontWeight: '600', marginBottom: 3, color: '#888' },
  senderLeft:  { alignSelf: 'flex-start' },
  senderRight: { alignSelf: 'flex-end' },

  bubble:      { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleLeft:  { backgroundColor: '#fff',    borderBottomLeftRadius: 4 },
  bubbleRight: { backgroundColor: '#1B4332', borderBottomRightRadius: 4 },

  msgBody:      { fontSize: 15, lineHeight: 21 },
  msgBodyLeft:  { color: '#1A1D21' },
  msgBodyRight: { color: '#fff' },

  msgTime:  { fontSize: 11, color: '#aaa', marginTop: 3 },
  readMark: { color: '#2AABEE' },
});
