import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

  const productLabel   = PRODUCT_LABELS[listing.productCategory]?.[lang] || listing.productCategory;
  const regionLabel    = listing.region  ? (REGION_LABELS[listing.region]?.[lang]     || listing.region)  : null;
  const conditionLabel = listing.process ? (CONDITION_LABELS[listing.process]?.[lang] || listing.process) : null;

  const images: string[] = listing.images || [];
  const hasImage = images.length > 0;

  const isBuy = listing.type === 'buy';
  // BUY = poster wants to buy → "WANTED"
  // SELL = poster is selling → "FOR SALE"
  const typeLabel = isBuy
    ? (lang === 'am' ? 'ፈልጓል' : lang === 'om' ? 'BARBAADA' : 'WANTED')
    : (lang === 'am' ? 'ለሽያጭ' : lang === 'om' ? 'GURGURAMAA' : 'FOR SALE');

  const priceStr = listing.price
    ? `${listing.currency === 'USD' ? '$' : ''}${Number(listing.price).toLocaleString()}${listing.currency === 'ETB' ? ' ETB' : ''}`
    : null;

  const tags: string[] = [];
  if (regionLabel) tags.push(regionLabel);
  if (listing.grade) tags.push(`G${listing.grade}`);
  if (conditionLabel) tags.push(conditionLabel);
  if (listing.quantity && listing.unit) tags.push(`${Number(listing.quantity).toLocaleString()} ${listing.unit}`);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.75}
    >
      {/* Image or placeholder */}
      {hasImage ? (
        <Image source={{ uri: images[0] }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="leaf-outline" size={32} color="#A5D6A7" />
        </View>
      )}

      {/* Body */}
      <View style={styles.body}>
        {/* Top row: badge + product + time */}
        <View style={styles.topRow}>
          <View style={[styles.typeBadge, isBuy ? styles.buyBadge : styles.sellBadge]}>
            <Text style={[styles.typeBadgeText, isBuy ? styles.buyText : styles.sellText]}>
              {typeLabel}
            </Text>
          </View>
          <Text style={styles.product} numberOfLines={1}>{productLabel}</Text>
          <Text style={styles.time}>{timeAgo(listing.createdAt)}</Text>
        </View>

        {/* Price */}
        {priceStr && (
          <Text style={styles.price}>{priceStr}</Text>
        )}

        {/* Tags row */}
        {tags.length > 0 && (
          <View style={styles.tags}>
            {tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#F0F0F0',
  },
  imagePlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: '#F1F8E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  buyBadge:  { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFD54F' },
  sellBadge: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#81C784' },
  typeBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  buyText:   { color: '#F57F17' },
  sellText:  { color: '#2E7D32' },
  product: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  time: {
    fontSize: 12,
    color: '#aaa',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#F5F5F5',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 12,
    color: '#555',
  },
});
