import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { REGION_LABELS, buildListingTitle } from '../lib/options';

interface ListingCardProps {
  listing: any;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n.language as 'en' | 'am' | 'om';

  const listingTitle = buildListingTitle(listing, lang);
  const regionLabel  = listing.region ? (REGION_LABELS[listing.region]?.[lang] || listing.region) : null;

  const images: string[] = listing.images || [];
  const hasImage = images.length > 0;
  const isBuy = listing.type === 'buy';

  const typeLabel = isBuy
    ? (lang === 'am' ? 'ፈልጓል'    : lang === 'om' ? 'BARBAADA'   : 'WANTED')
    : (lang === 'am' ? 'ለሽያጭ'    : lang === 'om' ? 'GURGURAMAA' : 'FOR SALE');

  const priceStr = listing.price
    ? `${listing.currency === 'USD' ? '$' : ''}${Number(listing.price).toLocaleString()}${listing.currency === 'ETB' ? ' ETB' : ''}`
    : null;

  // Grade is now part of the title — meta shows region + quantity only
  const metaParts: string[] = [];
  if (regionLabel)                      metaParts.push(regionLabel);
  if (listing.quantity && listing.unit) metaParts.push(`${Number(listing.quantity).toLocaleString()} ${listing.unit}`);
  const metaLine = metaParts.join('  ·  ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.82}
    >
      {/* Image */}
      <View style={styles.imageWrap}>
        {hasImage ? (
          <Image source={{ uri: images[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="leaf-outline" size={28} color="#A5D6A7" />
          </View>
        )}

        {/* Buy/Sell badge — bottom-left overlay */}
        <View style={[styles.badge, isBuy ? styles.badgeBuy : styles.badgeSell]}>
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>

        {/* Time — top-right overlay */}
        <View style={styles.timePill}>
          <Text style={styles.timePillText}>{timeAgo(listing.createdAt)}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.product} numberOfLines={2}>{listingTitle}</Text>

        {priceStr ? (
          <Text style={styles.price} numberOfLines={1}>{priceStr}</Text>
        ) : (
          <Text style={styles.priceEmpty}>Price on request</Text>
        )}

        {metaLine.length > 0 && (
          <Text style={styles.meta} numberOfLines={1}>{metaLine}</Text>
        )}

      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  /* Image */
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F1F8E9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F8E9',
  },

  /* Overlays */
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeBuy:  { backgroundColor: 'rgba(245,127,23,0.90)' },
  badgeSell: { backgroundColor: 'rgba(46,125,50,0.90)'  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  timePill: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  timePillText: { fontSize: 10, color: '#fff', fontWeight: '600' },

  /* Body */
  body: {
    padding: 10,
    gap: 3,
  },
  product: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 18,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E7D32',
    marginTop: 2,
  },
  priceEmpty: {
    fontSize: 12,
    color: '#bbb',
    fontStyle: 'italic',
    marginTop: 2,
  },
  meta: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
});
