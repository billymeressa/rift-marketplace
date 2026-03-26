import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface TrustBadgeProps {
  userId: string;
  size?: 'small' | 'large';
}

export default function TrustBadge({ userId, size = 'small' }: TrustBadgeProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['userTrust', userId],
    queryFn: () => api.getUserTrust(userId),
  });

  if (isLoading) {
    return <ActivityIndicator size="small" color="#1B4332" />;
  }

  if (!data) return null;

  if (size === 'large') {
    return (
      <View style={styles.largeCard}>
        <View style={styles.largeScoreRow}>
          <Ionicons name="shield-checkmark" size={28} color="#1B4332" />
          <Text style={styles.largeScore}>{data.score}</Text>
        </View>
        <View style={styles.verifiedRow}>
          <Ionicons
            name={data.verified ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={data.verified ? '#1B4332' : '#9E9E9E'}
          />
          <Text style={[styles.verifiedText, !data.verified && styles.unverifiedText]}>
            {data.verified ? 'Verified' : 'Unverified'}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data.completedOrders ?? 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data.avgRating?.toFixed(1) ?? '-'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.smallRow}>
      <Ionicons name="shield-checkmark" size={16} color="#1B4332" />
      <Text style={styles.smallScore}>{data.score}</Text>
      {data.verified && (
        <Ionicons name="checkmark-circle" size={14} color="#1B4332" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  smallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallScore: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1B4332',
  },
  largeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  largeScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  largeScore: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B4332',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B4332',
  },
  unverifiedText: {
    color: '#9E9E9E',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 4,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D21',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});
