import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import TrustBadge from './TrustBadge';
import { PRODUCT_LABELS, REGION_LABELS, CONDITION_LABELS } from '../lib/options';

interface ListingCardProps {
  listing: any;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n.language as 'en' | 'am' | 'om';

  const productLabel   = PRODUCT_LABELS[listing.productCategory]?.[lang]  || listing.productCategory;
  const regionLabel    = listing.region  ? (REGION_LABELS[listing.region]?.[lang]     || listing.region)  : null;
  const conditionLabel = listing.process ? (CONDITION_LABELS[listing.process]?.[lang] || listing.process) : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.badge, listing.type === 'buy' ? styles.buyBadge : styles.sellBadge]}>
          <Text style={styles.badgeText}>
            {listing.type === 'buy'
              ? (lang === 'am' ? 'ግዢ' : lang === 'om' ? 'BITTAA' : 'BUY')
              : (lang === 'am' ? 'ሽያጭ' : lang === 'om' ? 'GURGURTAA' : 'SELL')}
          </Text>
        </View>
        <Text style={styles.productBadge}>{productLabel}</Text>
        <Text style={styles.time}>{timeAgo(listing.createdAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>

      <View style={styles.details}>
        {regionLabel && (
          <Text style={styles.detail}>{regionLabel}</Text>
        )}
        {listing.grade && (
          <Text style={styles.detail}>G{listing.grade}</Text>
        )}
        {conditionLabel && (
          <Text style={styles.detail}>{conditionLabel}</Text>
        )}
        {listing.quantity && listing.unit && (
          <Text style={styles.detail}>{listing.quantity} {listing.unit}</Text>
        )}
      </View>

      {listing.price && (
        <Text style={styles.price}>
          {listing.currency === 'USD' ? '$' : ''}{Number(listing.price).toLocaleString()} {listing.currency === 'ETB' ? 'ETB' : ''}
        </Text>
      )}

      {listing.user?.name ? (
        <View style={styles.posterRow}>
          <Text style={styles.poster}>{listing.user.name}</Text>
          {listing.user?.id && <TrustBadge userId={listing.user.id} />}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  buyBadge: {
    backgroundColor: '#E8F5E9',
  },
  sellBadge: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
  },
  productBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginLeft: 'auto',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  detail: {
    fontSize: 13,
    color: '#555',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 6,
  },
  poster: {
    fontSize: 12,
    color: '#888',
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
});
