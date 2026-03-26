import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { REGION_LABELS, buildListingTitle } from '../lib/options';
import { isTelegramMiniApp } from '../lib/telegram-webapp';
import { getTMATheme } from '../lib/telegram-theme';

const isTMA = Platform.OS === 'web' && typeof window !== 'undefined' && isTelegramMiniApp();
const theme = isTMA ? getTMATheme() : null;

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

  const metaParts: string[] = [];
  if (regionLabel)                      metaParts.push(regionLabel);
  if (listing.quantity && listing.unit) metaParts.push(`${Number(listing.quantity).toLocaleString()} ${listing.unit}`);
  const metaLine = metaParts.join('  ·  ');

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isTMA && {
          backgroundColor: theme?.card || '#fff',
          borderRadius: 10,
          shadowOpacity: theme?.isDark ? 0 : 0.06,
        },
      ]}
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.82}
    >
      {/* Image */}
      <View style={[styles.imageWrap, isTMA && { borderTopLeftRadius: 10, borderTopRightRadius: 10 }]}>
        {hasImage ? (
          <Image source={{ uri: images[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[
            styles.imagePlaceholder,
            isTMA && { backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.05)' : '#F1F8E9' },
          ]}>
            <Ionicons name="leaf-outline" size={26} color={isTMA ? theme?.hint : '#A5D6A7'} />
          </View>
        )}

        {/* Buy/Sell badge */}
        <View style={[styles.badge, isBuy ? styles.badgeBuy : styles.badgeSell]}>
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>

        {/* Time pill */}
        <View style={styles.timePill}>
          <Text style={styles.timePillText}>{timeAgo(listing.createdAt)}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={[styles.body, isTMA && { padding: 8, gap: 2 }]}>
        <Text
          style={[styles.product, isTMA && { color: theme?.text, fontSize: 12 }]}
          numberOfLines={2}
        >
          {listingTitle}
        </Text>

        {priceStr ? (
          <Text
            style={[styles.price, isTMA && { color: theme?.accent, fontSize: 14 }]}
            numberOfLines={1}
          >
            {priceStr}
          </Text>
        ) : (
          <Text style={[styles.priceEmpty, isTMA && { color: theme?.hint }]}>Price on request</Text>
        )}

        {metaLine.length > 0 && (
          <Text
            style={[styles.meta, isTMA && { color: theme?.hint }]}
            numberOfLines={1}
          >
            {metaLine}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
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
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeBuy:  { backgroundColor: 'rgba(245,127,23,0.90)' },
  badgeSell: { backgroundColor: 'rgba(46,125,50,0.90)'  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  timePill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timePillText: { fontSize: 9, color: '#fff', fontWeight: '600' },

  /* Body */
  body: {
    padding: 10,
    gap: 3,
  },
  product: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 17,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E7D32',
    marginTop: 1,
  },
  priceEmpty: {
    fontSize: 11,
    color: '#bbb',
    fontStyle: 'italic',
    marginTop: 1,
  },
  meta: {
    fontSize: 10,
    color: '#999',
    marginTop: 1,
  },
});
