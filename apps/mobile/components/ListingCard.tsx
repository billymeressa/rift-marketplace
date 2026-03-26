import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { REGION_LABELS, buildListingTitle, PRODUCT_LABELS, CONDITION_LABELS } from '../lib/options';

interface ListingCardProps {
  listing: any;
  onDelete?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export default function ListingCard({ listing, onDelete }: ListingCardProps) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n.language as 'en' | 'am' | 'om';

  const listingTitle = buildListingTitle(listing, lang);
  const regionLabel  = listing.region ? (REGION_LABELS[listing.region]?.[lang] || listing.region) : null;

  const images: string[] = listing.images || [];
  const hasImage = images.length > 0;
  const isBuy = listing.type === 'buy';

  const typeLabel = isBuy
    ? (lang === 'am' ? 'ፈልጓል' : lang === 'om' ? 'BARBAADA' : 'WANTED')
    : (lang === 'am' ? 'ለሽያጭ' : lang === 'om' ? 'GURGURAMAA' : 'FOR SALE');

  const priceStr = listing.price
    ? `${listing.currency === 'USD' ? '$' : ''}${Number(listing.price).toLocaleString()}${listing.currency === 'ETB' ? ' ETB' : ''}`
    : null;

  const unitLabel = listing.unit || '';
  const pricePerUnit = listing.price && listing.unit
    ? `/${listing.unit}`
    : '';

  // Build compact spec line: region · quantity
  const specParts: string[] = [];
  if (regionLabel) specParts.push(regionLabel);
  if (listing.quantity && listing.unit)
    specParts.push(`${Number(listing.quantity).toLocaleString()} ${unitLabel}`);
  const specLine = specParts.join('  ·  ');

  // Process/condition label
  const processLabel = listing.process
    ? (CONDITION_LABELS[listing.process]?.[lang] || listing.process)
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {hasImage ? (
          <Image source={{ uri: images[0] }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="cube-outline" size={22} color="#9CA3AF" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.body}>
        {/* Top row: type badge + time */}
        <View style={styles.topRow}>
          <View style={[styles.typeBadge, isBuy ? styles.buyBadge : styles.sellBadge]}>
            <Text style={[styles.typeText, isBuy ? styles.buyText : styles.sellText]}>{typeLabel}</Text>
          </View>
          <Text style={styles.timeText}>{timeAgo(listing.createdAt)}</Text>
        </View>

        {/* Product title */}
        <Text style={styles.title} numberOfLines={2}>{listingTitle}</Text>

        {/* Spec line: region · quantity */}
        {specLine.length > 0 && (
          <Text style={styles.specLine} numberOfLines={1}>{specLine}</Text>
        )}

        {/* Price */}
        <View style={styles.priceRow}>
          {priceStr ? (
            <Text style={styles.price} numberOfLines={1}>
              {priceStr}<Text style={styles.perUnit}>{pricePerUnit}</Text>
            </Text>
          ) : (
            <Text style={styles.rfq}>Request Quote</Text>
          )}
        </View>

        {/* Delete button for own listings */}
        {onDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={13} color="#DC2626" />
            <Text style={styles.deleteBtnText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 1,
  },

  /* Thumbnail */
  thumbWrap: {
    width: 88,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },

  /* Body */
  body: {
    flex: 1,
    padding: 10,
    paddingLeft: 12,
    gap: 2,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },

  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  sellBadge: { backgroundColor: '#ECFDF5' },
  buyBadge:  { backgroundColor: '#EFF6FF' },
  typeText:  { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  sellText:  { color: '#065F46' },
  buyText:   { color: '#1E40AF' },

  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D21',
    lineHeight: 19,
  },

  specLine: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B4332',
  },
  perUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  rfq: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
    fontStyle: 'italic',
  },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
});
