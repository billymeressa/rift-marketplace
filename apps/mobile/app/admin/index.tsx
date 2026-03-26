import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../lib/api';

function StatCard({ icon, label, value, color, onPress }: {
  icon: any; label: string; value: string | number; color: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statText}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color="#ccc" />}
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const router = useRouter();

  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['admin', 'conversations'],
    queryFn: () => adminApi.getConversations(1, 100),
    staleTime: 30_000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(1, 200),
    staleTime: 30_000,
  });

  const conversations = convData?.data ?? [];
  const users         = usersData?.data ?? [];
  const loading       = convLoading || usersLoading;

  // Last 24 h activity
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentConvs = conversations.filter(
    (c: any) => new Date(c.lastMessageAt).getTime() > oneDayAgo
  );

  const recentUsers = users.filter(
    (u: any) => new Date(u.createdAt).getTime() > oneDayAgo
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Overview</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#1B4332" style={{ marginTop: 40 }} />
      ) : (
        <>
          <StatCard
            icon="people"
            label="Total Users"
            value={users.length}
            color="#1B4332"
            onPress={() => router.push('/admin/users')}
          />
          <StatCard
            icon="chatbubbles"
            label="Total Conversations"
            value={conversations.length}
            color="#0088cc"
            onPress={() => router.push('/admin/conversations')}
          />
          <StatCard
            icon="pulse"
            label="Active Last 24 h"
            value={recentConvs.length}
            color="#1E40AF"
            onPress={() => router.push('/admin/conversations')}
          />
          <StatCard
            icon="person-add"
            label="New Users (24 h)"
            value={recentUsers.length}
            color="#7B1FA2"
            onPress={() => router.push('/admin/users')}
          />

          {/* Recent conversations preview */}
          {conversations.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent Conversations</Text>
              {conversations.slice(0, 5).map((conv: any) => (
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
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.viewAll} onPress={() => router.push('/admin/conversations')}>
                <Text style={styles.viewAllText}>View all conversations →</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content:   { padding: 16, paddingBottom: 60 },
  heading:   { fontSize: 13, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  statCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 10, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statIcon:  { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statText:  { flex: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1A1D21' },
  statLabel: { fontSize: 13, color: '#888', marginTop: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
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
  convAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  convNames:   { fontSize: 14, fontWeight: '700', color: '#1A1D21' },
  convListing: { fontSize: 12, color: '#888', marginTop: 1 },
  convPreview: { fontSize: 12, color: '#aaa', marginTop: 2, fontStyle: 'italic' },
  viewAll: { alignItems: 'center', paddingVertical: 14 },
  viewAllText: { fontSize: 14, color: '#1B4332', fontWeight: '600' },
});
