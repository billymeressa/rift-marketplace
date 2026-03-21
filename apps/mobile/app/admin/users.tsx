import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../lib/api';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function AdminUsers() {
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(1, 200),
    staleTime: 30_000,
  });

  const users = data?.data ?? [];

  const filtered = search.trim()
    ? users.filter((u: any) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search)
      )
    : users;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone…"
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

      <Text style={styles.count}>
        {filtered.length} of {users.length} users
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
          renderItem={({ item: user }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.name || user.phone || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{user.name || '(no name)'}</Text>
                <Text style={styles.phone}>{user.phone}</Text>
                <Text style={styles.meta}>
                  Joined {formatDate(user.createdAt)}
                  {user.telegramUsername ? `  ·  @${user.telegramUsername}` : ''}
                  {user.preferredLanguage ? `  ·  ${user.preferredLanguage.toUpperCase()}` : ''}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#eee',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  count: { fontSize: 12, color: '#999', paddingHorizontal: 16, marginBottom: 4 },
  list: { paddingHorizontal: 12, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  name:  { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  phone: { fontSize: 13, color: '#2E7D32', fontWeight: '600', marginTop: 1 },
  meta:  { fontSize: 11, color: '#aaa', marginTop: 3 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#999' },
});
