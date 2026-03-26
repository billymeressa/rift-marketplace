import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../lib/api';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminConversations() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'conversations'],
    queryFn: () => adminApi.getConversations(1, 200),
    staleTime: 30_000,
  });

  const conversations = data?.data ?? [];

  const filtered = search.trim()
    ? conversations.filter((c: any) =>
        c.buyer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.seller?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.listing?.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.lastMessage?.body?.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by user or listing…"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1B4332" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No conversations yet</Text>
            </View>
          }
          contentContainerStyle={styles.list}
          renderItem={({ item: conv }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/admin/conversation/${conv.id}`)}
              activeOpacity={0.75}
            >
              {/* Avatar */}
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(conv.buyer?.name || '?')[0].toUpperCase()}
                </Text>
              </View>

              {/* Body */}
              <View style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.names} numberOfLines={1}>
                    {conv.buyer?.name ?? '—'} · {conv.seller?.name ?? '—'}
                  </Text>
                  <Text style={styles.time}>{timeAgo(conv.lastMessageAt)}</Text>
                </View>
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {conv.listing?.title ?? 'Unknown listing'}
                </Text>
                {conv.lastMessage && (
                  <Text style={styles.preview} numberOfLines={1}>
                    {conv.lastMessage.body}
                  </Text>
                )}

                {/* Participant phones */}
                <View style={styles.phones}>
                  <Ionicons name="call-outline" size={11} color="#bbb" />
                  <Text style={styles.phoneText}>
                    {conv.buyer?.phone}  ·  {conv.seller?.phone}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={16} color="#ddd" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1D21' },
  list: { paddingHorizontal: 12, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A1D21', alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  names:        { fontSize: 14, fontWeight: '700', color: '#1A1D21', flex: 1 },
  time:         { fontSize: 11, color: '#bbb', marginLeft: 8 },
  listingTitle: { fontSize: 12, color: '#1B4332', fontWeight: '600', marginBottom: 2 },
  preview:      { fontSize: 12, color: '#888', marginBottom: 4 },
  phones:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phoneText:    { fontSize: 11, color: '#bbb' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});
