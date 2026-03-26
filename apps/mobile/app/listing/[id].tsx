import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions, FlatList, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { isTelegramMiniApp, useTelegramBackButton } from '../../lib/telegram-webapp';
import { getTMATheme } from '../../lib/telegram-theme';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import TrustBadge from '../../components/TrustBadge';
import { useResponsive } from '../../hooks/useResponsive';
import {
  PRODUCT_LABELS, REGION_LABELS, CONDITION_LABELS,
  buildLabelMap, TRANSACTION_OPTIONS, prettifyValue, buildListingTitle,
} from '../../lib/options';

const isTMA = Platform.OS === 'web' && typeof window !== 'undefined' && isTelegramMiniApp();
const theme = isTMA ? getTMATheme() : null;

const TRANSACTION_LABELS = buildLabelMap(TRANSACTION_OPTIONS);

const LABEL_MAPS: Record<string, Record<string, { en: string; am: string; om: string }>> = {
  product: PRODUCT_LABELS,
  region: REGION_LABELS,
  process: CONDITION_LABELS,
  transaction: TRANSACTION_LABELS,
};

function getLabel(category: string, value: string | null, lang: 'en' | 'am' | 'om'): string | null {
  if (!value) return null;
  return LABEL_MAPS[category]?.[value]?.[lang] || prettifyValue(value);
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const lang = i18n.language as 'en' | 'am' | 'om';
  const { width: screenWidth } = useWindowDimensions();
  const { isMobile, detailMaxWidth } = useResponsive();

  const contentWidth = isMobile ? screenWidth : Math.min(screenWidth, detailMaxWidth);
  const galleryImageWidth = contentWidth;

  const queryClient = useQueryClient();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Telegram BackButton — navigates back instead of closing the mini app
  useEffect(() => useTelegramBackButton(() => router.back()), []);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.getListing(id!),
    enabled: !!id,
  });

  const handleDelete = () => {
    const msg = 'Are you sure you want to delete this listing? This cannot be undone.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDelete();
      return;
    }
    Alert.alert('Delete Listing', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const doDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteListing(id!);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to delete listing. Please try again.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loader, isTMA && { backgroundColor: theme?.bg }]}>
        <ActivityIndicator size="large" color={isTMA ? theme?.accent : '#2E7D32'} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.loader, isTMA && { backgroundColor: theme?.bg }]}>
        <Text style={[styles.errorText, isTMA && { color: theme?.hint }]}>{t('common.error')}</Text>
      </View>
    );
  }

  const isBuy = listing.type === 'buy';
  const images: string[] = listing.images || [];
  const isOwner = currentUser?.id && listing.user?.id && currentUser.id === listing.user.id;
  const canInteract = currentUser?.id && listing.user?.id && currentUser.id !== listing.user.id;

  return (
    <ScrollView style={[styles.container, isTMA && { backgroundColor: theme?.secondaryBg }]}>
      <View style={[
        styles.contentWrapper,
        isTMA && { backgroundColor: theme?.bg },
        !isMobile && { maxWidth: detailMaxWidth, alignSelf: 'center' as const, width: '100%' as any },
      ]}>
        {/* Image gallery */}
        {images.length > 0 && (
          <View style={[styles.galleryContainer, !isMobile && { borderRadius: 14, overflow: 'hidden', marginTop: 16 }]}>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / galleryImageWidth);
                setActiveImageIndex(index);
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={[styles.galleryImage, { width: galleryImageWidth }, isTMA && { height: 280 }]}
                  resizeMode="cover"
                />
              )}
            />
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[
                    styles.dot,
                    i === activeImageIndex && [styles.dotActive, isTMA && { backgroundColor: theme?.accent }],
                  ]} />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={[styles.content, isTMA && { padding: 16, paddingBottom: 24 }]}>
          {/* Type badge */}
          <View style={[styles.typeBanner, isBuy ? styles.buyBanner : styles.sellBanner]}>
            <Text style={[styles.typeText, isBuy ? styles.buyText : styles.sellText]}>
              {isBuy
                ? (lang === 'am' ? 'ፈልጓል' : lang === 'om' ? 'BARBAADA' : 'WANTED')
                : (lang === 'am' ? 'ለሽያጭ' : lang === 'om' ? 'GURGURAMAA' : 'FOR SALE')}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, isTMA && { color: theme?.text, fontSize: 20, marginBottom: 14 }]}>
            {buildListingTitle(listing, lang, { includeRegion: true })}
          </Text>

          {/* Details grid */}
          <View style={[
            styles.metaGrid,
            isTMA && { backgroundColor: theme?.secondaryBg, padding: 14, gap: 10 },
          ]}>
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

          {/* Description */}
          {listing.description && (
            <View style={styles.descSection}>
              <Text style={[styles.descLabel, isTMA && { color: theme?.subtitle }]}>{t('listing.description')}</Text>
              <Text style={[styles.descText, isTMA && { color: theme?.text }]}>{listing.description}</Text>
            </View>
          )}

          {/* Seller info */}
          <View style={[styles.posterSection, isTMA && { borderTopColor: theme?.separator }]}>
            <View style={[styles.posterAvatar, isTMA && { backgroundColor: theme?.accent }]}>
              <Ionicons name="storefront-outline" size={20} color={isTMA ? theme?.buttonText : '#fff'} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.posterName, isTMA && { color: theme?.text }]}>Seller</Text>
                {listing.user?.id && <TrustBadge userId={listing.user.id} />}
              </View>
              <Text style={[styles.posterDate, isTMA && { color: theme?.hint }]}>
                Posted {new Date(listing.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* CTAs for non-owners */}
          {canInteract && (
            <>
              <TouchableOpacity
                style={[styles.orderBtn, isTMA && { backgroundColor: theme?.button, borderRadius: 10, paddingVertical: 14 }]}
                onPress={() => router.push(`/order/create?listingId=${listing.id}`)}
              >
                <Ionicons name="cart-outline" size={18} color={isTMA ? theme?.buttonText : '#fff'} />
                <Text style={[styles.orderBtnText, isTMA && { color: theme?.buttonText, fontSize: 15 }]}>
                  {isBuy ? t('order.makeOffer') : t('order.createOrder')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.messageBtn,
                  isTMA && {
                    borderColor: theme?.accent,
                    backgroundColor: theme?.bg,
                    borderRadius: 10,
                    paddingVertical: 14,
                  },
                ]}
                onPress={() => router.push(`/message-compose?listingId=${listing.id}&sellerId=${listing.user.id}`)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={isTMA ? theme?.accent : '#2E7D32'} />
                <Text style={[styles.messageBtnText, isTMA && { color: theme?.accent, fontSize: 15 }]}>
                  {t('messages.sendMessage')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Owner actions */}
          {isOwner && (
            <>
              <TouchableOpacity
                style={[styles.editBtn, isTMA && { borderColor: theme?.accent, backgroundColor: theme?.bg, borderRadius: 10, paddingVertical: 14 }]}
                onPress={() => router.push(`/listing/edit/${listing.id}`)}
              >
                <Ionicons name="create-outline" size={18} color={isTMA ? theme?.accent : '#2E7D32'} />
                <Text style={[styles.editBtnText, isTMA && { color: theme?.accent, fontSize: 15 }]}>
                  {t('common.edit')} {t('listing.listing') || 'Listing'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteBtn,
                  isTMA && { borderColor: theme?.destructive, backgroundColor: theme?.bg, borderRadius: 10, paddingVertical: 14 },
                  isDeleting && styles.deleteBtnDisabled,
                ]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? <ActivityIndicator size="small" color={isTMA ? theme?.destructive : '#D32F2F'} />
                  : <Ionicons name="trash-outline" size={18} color={isTMA ? theme?.destructive : '#D32F2F'} />
                }
                <Text style={[styles.deleteBtnText, isTMA && { color: theme?.destructive, fontSize: 15 }]}>
                  Delete Listing
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, isTMA && { color: theme?.hint }]}>{label}</Text>
      <Text style={[styles.detailValue, isTMA && { color: theme?.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  contentWrapper: {
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  galleryContainer: {
    backgroundColor: '#F0F0F0',
  },
  galleryImage: {
    height: 320,
    backgroundColor: '#E0E0E0',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ccc',
  },
  dotActive: {
    backgroundColor: '#2E7D32',
    width: 18,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
  },
  buyBanner:  { backgroundColor: '#FFF8E1', borderColor: '#FFD54F' },
  sellBanner: { backgroundColor: '#E8F5E9', borderColor: '#81C784' },
  typeText:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  buyText:    { color: '#F57F17' },
  sellText:   { color: '#2E7D32' },
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
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  descSection: {
    marginBottom: 16,
  },
  descLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  descText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 21,
  },
  posterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 16,
  },
  posterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  posterDate: {
    fontSize: 12,
    color: '#999',
  },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    marginTop: 8,
  },
  orderBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    backgroundColor: '#fff',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  messageBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D32F2F',
  },
});
