import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../lib/api';

type StatusFilter = 'all' | 'proposed' | 'payment_held' | 'payment_held_inspection' | 'shipped' | 'disputed' | 'completed';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',                    label: 'All' },
  { key: 'proposed',               label: 'Proposed' },
  { key: 'payment_held',           label: 'Payment Held' },
  { key: 'payment_held_inspection',label: 'Inspection' },
  { key: 'shipped',                label: 'In Transit' },
  { key: 'disputed',               label: 'Disputed' },
  { key: 'completed',              label: 'Completed' },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusColor(s: string) {
  switch (s) {
    case 'completed':    return '#059669';
    case 'disputed':     return '#DC2626';
    case 'shipped':      return '#1E40AF';
    case 'payment_held': return '#D97706';
    case 'proposed':     return '#6B7280';
    case 'cancelled':    return '#9CA3AF';
    default:             return '#6B7280';
  }
}

function statusBg(s: string) {
  switch (s) {
    case 'completed':    return '#ECFDF5';
    case 'disputed':     return '#FEF2F2';
    case 'shipped':      return '#EFF6FF';
    case 'payment_held': return '#FFFBEB';
    case 'proposed':     return '#F3F4F6';
    case 'cancelled':    return '#F9FAFB';
    default:             return '#F3F4F6';
  }
}

function escrowColor(s: string) {
  switch (s) {
    case 'held':     return '#D97706';
    case 'released': return '#059669';
    case 'refunded': return '#1E40AF';
    default:         return '#9CA3AF';
  }
}

export default function AdminOrders() {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const apiStatus = filter === 'all'
    ? undefined
    : filter === 'payment_held_inspection'
      ? 'payment_held'
      : filter;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'orders', filter, page],
    queryFn: () => adminApi.getOrders({
      ...(apiStatus ? { status: apiStatus } : {}),
      page,
      limit: 30,
    }),
    staleTime: 20_000,
  });

  const orders = data?.data ?? [];
  const total  = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const handleFilterChange = (f: StatusFilter) => {
    setFilter(f);
    setPage(1);
  };

  return (
    <View style={styles.container}>
      {/* Filter tabs — horizontal scroll */}
      <View style={styles.tabsWrapper}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i.key}
          contentContainerStyle={styles.tabs}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, filter === item.key && styles.tabActive]}
              onPress={() => handleFilterChange(item.key)}
            >
              <Text style={[styles.tabText, filter === item.key && styles.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <Text style={styles.count}>{total} order{total !== 1 ? 's' : ''}</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1B4332" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          onRefresh={() => { setPage(1); refetch(); }}
          refreshing={isRefetching}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={56} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySub}>Try a different filter</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMore}
                onPress={() => setPage(p => p + 1)}
              >
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item: order }) => (
            <TouchableOpacity
              style={[styles.card, order.needsAction && styles.cardAlert]}
              onPress={() => router.push(`/admin/order/${order.id}`)}
              activeOpacity={0.75}
            >
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderId}>#{order.id.slice(-8).toUpperCase()}</Text>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {order.listing?.title ?? '—'}
                  </Text>
                  {order.listing?.productCategory && (
                    <Text style={styles.category}>{order.listing.productCategory}</Text>
                  )}
                </View>
                {order.needsAction && (
                  <View style={styles.needsActionBadge}>
                    <Ionicons name="alert-circle" size={14} color="#DC2626" />
                    <Text style={styles.needsActionText}>Action needed</Text>
                  </View>
                )}
              </View>

              {/* Buyer → Seller */}
              <View style={styles.parties}>
                <Text style={styles.partyName} numberOfLines={1}>
                  {order.buyer?.name ?? '—'}
                </Text>
                <Ionicons name="arrow-forward" size={12} color="#9CA3AF" />
                <Text style={styles.partyName} numberOfLines={1}>
                  {order.seller?.name ?? '—'}
                </Text>
              </View>

              {/* Footer row */}
              <View style={styles.cardFooter}>
                <Text style={styles.price}>
                  {Number(order.totalPrice).toLocaleString()} {order.currency}
                </Text>
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: statusBg(order.status) }]}>
                    <Text style={[styles.badgeText, { color: statusColor(order.status) }]}>
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                  {order.escrowStatus !== 'none' && (
                    <View style={[styles.badge, { backgroundColor: escrowColor(order.escrowStatus) + '1A' }]}>
                      <Text style={[styles.badgeText, { color: escrowColor(order.escrowStatus) }]}>
                        {order.escrowStatus.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.dateText}>{formatDate(order.createdAt)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  tabsWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabs: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#1B4332' },
  tabText:       { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },

  count: { fontSize: 11, color: '#9CA3AF', paddingHorizontal: 16, paddingTop: 10, marginBottom: 2 },
  list:  { paddingHorizontal: 12, paddingBottom: 40, paddingTop: 6 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardAlert: {
    borderWidth: 1.5, borderColor: '#FCA5A5',
  },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  orderId:      { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  listingTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 },
  category:     { fontSize: 11, color: '#6B7280', marginTop: 2 },

  needsActionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  needsActionText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },

  parties: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10,
  },
  partyName: { fontSize: 13, color: '#374151', fontWeight: '600', flex: 1 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6,
  },
  price: { fontSize: 14, fontWeight: '800', color: '#1B4332' },
  badges: { flexDirection: 'row', gap: 6 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  dateText: { fontSize: 11, color: '#9CA3AF' },

  loadMore: {
    alignItems: 'center', paddingVertical: 14,
    backgroundColor: '#fff', borderRadius: 12,
    marginHorizontal: 0, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: '#1B4332' },

  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub:   { fontSize: 13, color: '#9CA3AF' },
});
