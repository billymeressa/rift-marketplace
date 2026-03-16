import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import TrustBadge from '../../components/TrustBadge';

const LABELS: Record<string, Record<string, { en: string; am: string }>> = {
  product: {
    coffee: { en: 'Coffee', am: 'ቡና' },
    sesame: { en: 'Sesame', am: 'ሰሊጥ' },
    mung_bean: { en: 'Mung Bean', am: 'ማሾ' },
    oilseed: { en: 'Oil Seeds', am: 'የቅባት እህሎች' },
    spice: { en: 'Spices', am: 'ቅመማ ቅመም' },
    equipment: { en: 'Equipment', am: 'መሣሪያዎች' },
    other: { en: 'Other', am: 'ሌላ' },
  },
  region: {
    yirgacheffe: { en: 'Yirgacheffe', am: 'ይርጋጨፌ' },
    sidama: { en: 'Sidama', am: 'ሲዳማ' },
    guji: { en: 'Guji', am: 'ጉጂ' },
    jimma: { en: 'Jimma', am: 'ጅማ' },
    nekemte: { en: 'Nekemte', am: 'ነቀምት' },
    limu: { en: 'Limu', am: 'ሊሙ' },
    kafa: { en: 'Kafa', am: 'ካፋ' },
    teppi: { en: 'Teppi', am: 'ቴፒ' },
    illubabur: { en: 'Illubabur', am: 'ኢሉባቡር' },
    bale: { en: 'Bale', am: 'ባሌ' },
    harar: { en: 'Harar', am: 'ሀረር' },
    bench_maji: { en: 'Bench Maji', am: 'ቤንች ማጂ' },
    west_arsi: { en: 'West Arsi', am: 'ምዕራብ አርሲ' },
  },
  process: {
    washed: { en: 'Washed', am: 'የታጠበ' },
    natural: { en: 'Natural', am: 'ተፈጥሯዊ' },
    unwashed: { en: 'Unwashed', am: 'ያልታጠበ' },
  },
  transaction: {
    vertical: { en: 'Vertical', am: 'ትስስር' },
    horizontal: { en: 'Horizontal', am: 'አግድም' },
  },
};

function getLabel(category: string, value: string | null, lang: 'en' | 'am'): string | null {
  if (!value) return null;
  return LABELS[category]?.[value]?.[lang] || value;
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const lang = i18n.language as 'en' | 'am';

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.getListing(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
      </View>
    );
  }

  const handleCall = () => {
    if (listing.user?.phone) {
      Linking.openURL(`tel:${listing.user.phone}`);
    }
  };

  const handleTelegram = () => {
    if (listing.user?.telegramUsername) {
      Linking.openURL(`https://t.me/${listing.user.telegramUsername}`);
    } else if (listing.user?.phone) {
      // Try opening Telegram with phone number
      Linking.openURL(`https://t.me/${listing.user.phone.replace('+', '')}`);
    }
  };

  const isBuy = listing.type === 'buy';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.typeBanner, isBuy ? styles.buyBanner : styles.sellBanner]}>
        <Text style={styles.typeText}>
          {isBuy ? (lang === 'am' ? 'ግዢ' : 'BUYING') : (lang === 'am' ? 'ሽያጭ' : 'SELLING')}
        </Text>
      </View>

      <Text style={styles.title}>{listing.title}</Text>

      <View style={styles.metaGrid}>
        <DetailRow label={t('listing.product')} value={getLabel('product', listing.productCategory, lang)} />
        {listing.region && <DetailRow label={t('listing.region')} value={getLabel('region', listing.region, lang)} />}
        {listing.grade && <DetailRow label={t('listing.grade')} value={`Grade ${listing.grade}`} />}
        {listing.process && <DetailRow label={t('listing.process')} value={getLabel('process', listing.process, lang)} />}
        {listing.transactionType && <DetailRow label={t('listing.transactionType')} value={getLabel('transaction', listing.transactionType, lang)} />}
        {listing.quantity && <DetailRow label={t('listing.quantity')} value={`${listing.quantity} ${listing.unit || ''}`} />}
        {listing.price && (
          <DetailRow
            label={t('listing.price')}
            value={`${listing.currency === 'USD' ? '$' : ''}${Number(listing.price).toLocaleString()} ${listing.currency === 'ETB' ? 'ETB' : ''}`}
          />
        )}
      </View>

      {listing.description && (
        <View style={styles.descSection}>
          <Text style={styles.descLabel}>{t('listing.description')}</Text>
          <Text style={styles.descText}>{listing.description}</Text>
        </View>
      )}

      <View style={styles.posterSection}>
        <View style={styles.posterAvatar}>
          <Text style={styles.posterAvatarText}>
            {(listing.user?.name || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.posterName}>{listing.user?.name || t('listing.postedBy')}</Text>
            {listing.user?.id && <TrustBadge userId={listing.user.id} />}
          </View>
          <Text style={styles.posterDate}>
            {new Date(listing.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.contactRow}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Ionicons name="call-outline" size={20} color="#fff" />
          <Text style={styles.callText}>{t('common.call')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.telegramBtn} onPress={handleTelegram}>
          <Ionicons name="send-outline" size={20} color="#fff" />
          <Text style={styles.telegramText}>{t('common.telegram')}</Text>
        </TouchableOpacity>
      </View>

      {currentUser?.id && listing.user?.id && currentUser.id !== listing.user.id && (
        <TouchableOpacity
          style={styles.orderBtn}
          onPress={() => router.push(`/order/create?listingId=${listing.id}`)}
        >
          <Ionicons name="cart-outline" size={20} color="#fff" />
          <Text style={styles.orderBtnText}>
            {isBuy ? t('order.makeOffer') : t('order.createOrder')}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  typeBanner: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  buyBanner: {
    backgroundColor: '#E8F5E9',
  },
  sellBanner: {
    backgroundColor: '#FFF3E0',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  metaGrid: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  descSection: {
    marginBottom: 20,
  },
  descLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  descText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  posterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 20,
  },
  posterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  posterName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  posterDate: {
    fontSize: 13,
    color: '#999',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
  },
  callText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  telegramBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#0088cc',
  },
  telegramText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    marginTop: 12,
  },
  orderBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
