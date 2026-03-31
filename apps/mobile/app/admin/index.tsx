import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../lib/api';

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  icon, label, value, sub, color, onPress, alert,
}: {
  icon: any; label: string; value: number | string;
  sub?: string; color: string; onPress?: () => void; alert?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.tile, alert && styles.tileAlert]}
      onPress={onPress}
      activeOpacity={onPress ? 0.72 : 1}
    >
      <View style={[styles.tileIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {sub && <Text style={[styles.tileSub, alert && styles.tileSubAlert]}>{sub}</Text>}
    </TouchableOpacity>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

function ActionBtn({
  icon, label, badge, color, onPress,
}: {
  icon: any; label: string; badge?: number; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.78}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={22} color="#fff" />
        {!!badge && badge > 0 && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
    staleTime: 30_000,
  });

  const { data: convData } = useQuery({
    queryKey: ['admin', 'conversations'],
    queryFn: () => adminApi.getConversations(1, 5),
    staleTime: 30_000,
  });

  const { data: escrowData } = useQuery({
    queryKey: ['admin', 'escrow', 'summary'],
    queryFn: adminApi.getEscrowSummary,
    staleTime: 60_000,
  });

  const { data: ordersNeedingAction } = useQuery({
    queryKey: ['admin', 'orders', 'needsAction'],
    queryFn: () => adminApi.getOrders({ limit: 100 }),
    staleTime: 60_000,
    select: (data) => (data?.data ?? []).filter((o: any) => o.needsAction).length,
  });

  const recentConvs = convData?.data?.slice(0, 4) ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetchStats} tintColor="#1B4332" />
      }
    >
      {/* Header banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>Admin Dashboard</Text>
          <Text style={styles.bannerSub}>Nile<Text style={{ color: '#4ADE80' }}>Xport</Text> Platform</Text>
        </View>
        <View style={styles.bannerBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#4ADE80" />
          <Text style={styles.bannerBadgeText}>Admin</Text>
        </View>
      </View>

      {/* Stats grid */}
      <Text style={styles.sectionTitle}>PLATFORM OVERVIEW</Text>

      {statsLoading ? (
        <ActivityIndicator size="large" color="#1B4332" style={{ marginVertical: 40 }} />
      ) : (
        <View style={styles.grid}>
          <StatTile
            icon="people"
            label="Total Users"
            value={stats?.totalUsers ?? 0}
            sub={stats?.newUsersToday ? `+${stats.newUsersToday} today` : undefined}
            color="#1B4332"
            onPress={() => router.push('/admin/users')}
          />
          <StatTile
            icon="storefront"
            label="Active Listings"
            value={stats?.activeListings ?? 0}
            sub={`${stats?.totalListings ?? 0} total`}
            color="#1E40AF"
            onPress={() => router.push('/admin/listings')}
          />
          <StatTile
            icon="receipt"
            label="Total Orders"
            value={stats?.totalOrders ?? 0}
            color="#7B1FA2"
            onPress={() => router.push('/admin/users')}
          />
          <StatTile
            icon="shield-checkmark"
            label="Pending Verif."
            value={stats?.pendingVerifications ?? 0}
            color="#D97706"
            alert={(stats?.pendingVerifications ?? 0) > 0}
            sub={(stats?.pendingVerifications ?? 0) > 0 ? 'Needs review' : 'All clear'}
            onPress={() => router.push('/admin/verifications')}
          />
          <StatTile
            icon="chatbubbles"
            label="Conversations"
            value={stats?.totalConversations ?? 0}
            sub={`${stats?.activeConversations ?? 0} active (7d)`}
            color="#0088CC"
            onPress={() => router.push('/admin/conversations')}
          />
          <StatTile
            icon="trending-up"
            label="Engagement"
            value={stats && stats.totalUsers > 0
              ? `${Math.round((stats.activeConversations / stats.totalUsers) * 100)}%`
              : '—'
            }
            sub="conv / user (7d)"
            color="#059669"
          />
          <StatTile
            icon="cash-outline"
            label="Escrow Held"
            value={escrowData ? `${escrowData.countHeld}` : '—'}
            sub={escrowData ? `${escrowData.totalHeld.toLocaleString()} ETB` : undefined}
            color="#D97706"
            onPress={() => router.push('/admin/orders')}
          />
          <StatTile
            icon="alert-circle"
            label="Disputed"
            value={escrowData?.countDisputed ?? '—'}
            sub={escrowData?.countDisputed ? 'Needs resolution' : 'None'}
            color="#DC2626"
            alert={(escrowData?.countDisputed ?? 0) > 0}
            onPress={() => router.push('/admin/orders')}
          />
        </View>
      )}

      {/* Quick actions */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>MANAGEMENT</Text>
      <View style={styles.actions}>
        <ActionBtn
          icon="people"
          label="Users"
          color="#1B4332"
          onPress={() => router.push('/admin/users')}
        />
        <ActionBtn
          icon="storefront"
          label="Listings"
          color="#1E40AF"
          onPress={() => router.push('/admin/listings')}
        />
        <ActionBtn
          icon="shield-checkmark"
          label="Verifications"
          badge={stats?.pendingVerifications}
          color="#D97706"
          onPress={() => router.push('/admin/verifications')}
        />
        <ActionBtn
          icon="chatbubbles"
          label="Messages"
          color="#0088CC"
          onPress={() => router.push('/admin/conversations')}
        />
        <ActionBtn
          icon="receipt-outline"
          label="Orders"
          badge={ordersNeedingAction}
          color="#7B1FA2"
          onPress={() => router.push('/admin/orders')}
        />
        <ActionBtn
          icon="car-sport-outline"
          label="Logistics"
          color="#1E40AF"
          onPress={() => router.push('/admin/logistics')}
        />
      </View>

      {/* Recent conversations */}
      {recentConvs.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>RECENT ACTIVITY</Text>
          {recentConvs.map((conv: any) => (
            <TouchableOpacity
              key={conv.id}
              style={styles.convRow}
              onPress={() => router.push(`/admin/conversation/${conv.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.convAvatar}>
                <Text style={styles.convAvatarText}>
                  {(conv.buyer?.name || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.convNames} numberOfLines={1}>
                  {conv.buyer?.name ?? '—'} → {conv.seller?.name ?? '—'}
                </Text>
                <Text style={styles.convListing} numberOfLines={1}>
                  {conv.listing?.title ?? 'Unknown listing'}
                </Text>
                {conv.lastMessage && (
                  <Text style={styles.convPreview} numberOfLines={1}>
                    {conv.lastMessage.body}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ddd" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.viewAll} onPress={() => router.push('/admin/conversations')}>
            <Text style={styles.viewAllText}>View all conversations →</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content:   { padding: 16, paddingBottom: 60 },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1D21',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
  },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  bannerSub:   { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  bannerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1B4332', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  bannerBadgeText: { fontSize: 12, fontWeight: '700', color: '#4ADE80' },

  // Section title
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },

  // Stats grid (2 columns)
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  tile: {
    flex: 1, minWidth: '45%',
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tileAlert: {
    borderWidth: 1.5, borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  tileIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  tileValue: { fontSize: 26, fontWeight: '800', color: '#1A1D21' },
  tileLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  tileSub:      { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  tileSubAlert: { color: '#D97706', fontWeight: '600' },

  // Quick actions grid
  actions: {
    flexDirection: 'row', gap: 10,
  },
  actionBtn: { flex: 1, alignItems: 'center', gap: 8 },
  actionIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  actionBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#DC2626', borderRadius: 10,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  actionBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },

  // Recent conversations
  convRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  convAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1B4332', alignItems: 'center', justifyContent: 'center',
  },
  convAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  convNames:   { fontSize: 14, fontWeight: '700', color: '#1A1D21' },
  convListing: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  convPreview: { fontSize: 12, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' },
  viewAll:     { alignItems: 'center', paddingVertical: 14 },
  viewAllText: { fontSize: 14, color: '#1B4332', fontWeight: '600' },
});
