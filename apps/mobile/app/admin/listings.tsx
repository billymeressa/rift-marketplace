import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../lib/api';

type StatusFilter = 'all' | 'active' | 'closed';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function TypeBadge({ type }: { type: string }) {
  const isSell = type === 'sell';
  return (
    <View style={[badge.wrap, isSell ? badge.sell : badge.buy]}>
      <Text style={[badge.text, isSell ? badge.sellText : badge.buyText]}>
        {isSell ? 'FOR SALE' : 'WANTED'}
      </Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sell: { backgroundColor: '#ECFDF5' },
  buy:  { backgroundColor: '#EFF6FF' },
  text: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  sellText: { color: '#1B4332' },
  buyText:  { color: '#1E40AF' },
});

export default function AdminListings() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const params: Record<string, string> = { limit: '100' };
  if (statusFilter !== 'all') params.status = statusFilter;
  if (search.trim()) params.search = search.trim();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'listings', statusFilter, search],
    queryFn: () => adminApi.getListings(params),
    staleTime: 20_000,
  });

  const items = data?.data ?? [];

  const handleToggleStatus = (item: any) => {
    const newStatus = item.status === 'active' ? 'closed' : 'active';
    const msg = newStatus === 'closed'
      ? `Close listing "${item.title}"? It will be hidden from the marketplace.`
      : `Reactivate listing "${item.title}"?`;

    const doIt = async () => {
      setUpdatingId(item.id);
      try {
        await adminApi.updateListingStatus(item.id, newStatus);
        queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to update listing');
      } finally {
        setUpdatingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doIt();
      return;
    }
    Alert.alert('Update Listing', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: newStatus === 'closed' ? 'Close' : 'Reactivate', onPress: doIt },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={15} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status filter tabs */}
      <View style={styles.tabs}>
        {(['all', 'active', 'closed'] as StatusFilter[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.tab, statusFilter === s && styles.tabActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.tabText, statusFilter === s && styles.tabTextActive]}>
              {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Closed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.count}>{items.length} listing{items.length !== 1 ? 's' : ''}</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1B4332" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={48} color="#E5E7EB" />
              <Text style={styles.emptyText}>No listings found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.status === 'closed' && styles.cardClosed]}>
              <View style={styles.cardTop}>
                <TypeBadge type={item.type} />
                {item.status === 'closed' && (
                  <View style={styles.closedTag}>
                    <Text style={styles.closedTagText}>CLOSED</Text>
                  </View>
                )}
                <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
              </View>

              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

              <View style={styles.cardMeta}>
                <Ionicons name="person-outline" size={12} color="#9CA3AF" />
                <Text style={styles.cardMetaText}>{item.userName || '—'}</Text>
                {item.userPhone && (
                  <>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.cardMetaText}>{item.userPhone}</Text>
                  </>
                )}
              </View>

              {(item.quantity || item.price) && (
                <View style={styles.cardMeta}>
                  {item.quantity && (
                    <>
                      <Ionicons name="scale-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.cardMetaText}>{item.quantity} {item.unit}</Text>
                    </>
                  )}
                  {item.price && (
                    <>
                      <Text style={styles.dot}>·</Text>
                      <Text style={[styles.cardMetaText, { fontWeight: '700', color: '#1A1D21' }]}>
                        {Number(item.price).toLocaleString()} {item.currency}
                      </Text>
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, item.status === 'active' ? styles.actionClose : styles.actionOpen]}
                onPress={() => handleToggleStatus(item)}
                disabled={updatingId === item.id}
              >
                {updatingId === item.id ? (
                  <ActivityIndicator size="small" color={item.status === 'active' ? '#DC2626' : '#1B4332'} />
                ) : (
                  <>
                    <Ionicons
                      name={item.status === 'active' ? 'close-circle-outline' : 'checkmark-circle-outline'}
                      size={15}
                      color={item.status === 'active' ? '#DC2626' : '#1B4332'}
                    />
                    <Text style={[styles.actionBtnText, item.status === 'active' ? styles.closeText : styles.openText]}>
                      {item.status === 'active' ? 'Close Listing' : 'Reactivate'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  searchRow: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1D21' },

  tabs: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#1B4332' },
  tabText:       { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  count: { fontSize: 11, color: '#9CA3AF', paddingHorizontal: 16, marginBottom: 4 },
  list: { paddingHorizontal: 12, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardClosed: { opacity: 0.65, backgroundColor: '#F9FAFB' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  closedTag: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    backgroundColor: '#FEE2E2',
  },
  closedTagText: { fontSize: 9, fontWeight: '700', color: '#DC2626', letterSpacing: 0.4 },
  cardDate: { fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1D21', marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  cardMetaText: { fontSize: 12, color: '#6B7280' },
  dot: { fontSize: 12, color: '#D1D5DB' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    marginTop: 10, alignSelf: 'flex-start',
  },
  actionClose: { backgroundColor: '#FEF2F2' },
  actionOpen:  { backgroundColor: '#ECFDF5' },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  closeText: { color: '#DC2626' },
  openText:  { color: '#1B4332' },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});
