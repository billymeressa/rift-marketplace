import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTelegramBackButton } from '../../lib/telegram-webapp';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import TrustBadge from '../../components/TrustBadge';
import { useResponsive } from '../../hooks/useResponsive';
import {
  PRODUCT_LABELS, REGION_LABELS, CONDITION_LABELS,
  buildLabelMap, TRANSACTION_OPTIONS, UNIT_OPTIONS,
  prettifyValue, buildListingTitle,
} from '../../lib/options';

const TRANSACTION_LABELS = buildLabelMap(TRANSACTION_OPTIONS);
const UNIT_LABELS = buildLabelMap(UNIT_OPTIONS);

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

  useEffect(() => useTelegramBackButton(() => router.back()), []);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.getListing(id!),
    enabled: !!id,
  });

  const handleDelete = () => {
    Alert.alert(
      lang === 'am' ? 'ዝርዝር ሰርዝ' : 'Delete Listing',
      lang === 'am' ? 'እርግጠኛ ነዎት? ይህ ሊቀለበስ አይችልም።' : 'Are you sure you want to delete this listing? This cannot be undone.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await api.deleteListing(id!);
              queryClient.invalidateQueries({ queryKey: ['listings'] });
              router.back();
            } catch {
              Alert.alert(t('common.error'), 'Failed to delete listing. Please try again.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.loader}>
        <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
        <Text style={styles.errorText}>{t('common.error')}</Text>
      </View>
    );
  }

  const isBuy = listing.type === 'buy';
  const images: string[] = listing.images || [];
  const isOwner = currentUser?.id && listing.user?.id && currentUser.id === listing.user.id;

  // Build specs array for the data table
  const specs: { label: string; value: string; icon?: string }[] = [];

  const productLabel = getLabel('product', listing.productCategory, lang);
  if (productLabel) specs.push({
    label: lang === 'am' ? 'ምርት' : lang === 'om' ? 'Oomisha' : 'Product',
    value: productLabel,
    icon: 'cube-outline',
  });

  const regionLabel = getLabel('region', listing.region, lang);
  if (regionLabel) specs.push({
    label: lang === 'am' ? 'ክልል' : lang === 'om' ? 'Naannoo' : 'Origin Region',
    value: regionLabel,
    icon: 'location-outline',
  });

  if (listing.grade) specs.push({
    label: lang === 'am' ? 'ደረጃ' : lang === 'om' ? 'Sadarkaa' : 'Quality Grade',
    value: `Grade ${listing.grade}`,
    icon: 'ribbon-outline',
  });

  const processLabel = getLabel('process', listing.process, lang);
  if (processLabel) specs.push({
    label: lang === 'am' ? 'ሂደት' : lang === 'om' ? 'Haala' : 'Processing',
    value: processLabel,
    icon: 'cog-outline',
  });

  const txLabel = getLabel('transaction', listing.transactionType, lang);
  if (txLabel) specs.push({
    label: lang === 'am' ? 'የግብይት ዓይነት' : lang === 'om' ? 'Gosa Daldala' : 'Transaction',
    value: txLabel,
    icon: 'swap-horizontal-outline',
  });

  if (listing.quantity) specs.push({
    label: lang === 'am' ? 'መጠን' : lang === 'om' ? 'Hamma' : 'Quantity Available',
    value: `${Number(listing.quantity).toLocaleString()} ${listing.unit || ''}`,
    icon: 'layers-outline',
  });

  return (
    <ScrollView style={styles.container}>
      <View style={[
        styles.contentWrapper,
        !isMobile && { maxWidth: detailMaxWidth, alignSelf: 'center' as const, width: '100%' as any },
      ]}>
        {/* Image gallery */}
        {images.length > 0 && (
          <View style={[styles.galleryContainer, !isMobile && { borderRadius: 8, overflow: 'hidden', marginTop: 16, marginHorizontal: 16 }]}>
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
                  style={[styles.galleryImage, { width: galleryImageWidth }]}
                  resizeMode="cover"
                />
              )}
            />
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeImageIndex && styles.dotActive]} />
                ))}
              </View>
            )}
            {/* Image counter */}
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>{activeImageIndex + 1}/{images.length}</Text>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {/* Type badge + posted date row */}
          <View style={styles.headerRow}>
            <View style={[styles.typeBadge, isBuy ? styles.buyBadge : styles.sellBadge]}>
              <Text style={[styles.typeText, isBuy ? styles.buyText : styles.sellText]}>
                {isBuy
                  ? (lang === 'am' ? 'ፈልጓል' : lang === 'om' ? 'BARBAADA' : 'WANTED')
                  : (lang === 'am' ? 'ለሽያጭ' : lang === 'om' ? 'GURGURAMAA' : 'FOR SALE')}
              </Text>
            </View>
            <Text style={styles.postedDate}>
              {lang === 'am' ? 'ተለጠፈ' : 'Posted'} {new Date(listing.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {buildListingTitle(listing, lang, { includeRegion: true })}
          </Text>

          {/* Price section */}
          {listing.price && (
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>
                {lang === 'am' ? 'ዋጋ' : lang === 'om' ? 'Gatii' : 'Price'}
              </Text>
              <Text style={styles.priceValue}>
                {listing.currency === 'USD' ? '$' : ''}
                {Number(listing.price).toLocaleString()}
                {listing.currency === 'ETB' ? ' ETB' : ''}
              </Text>
              {listing.unit && (
                <Text style={styles.priceUnit}>
                  / {UNIT_LABELS[listing.unit]?.[lang] || listing.unit}
                </Text>
              )}
            </View>
          )}

          {/* Technical specifications table */}
          <View style={styles.specsCard}>
            <Text style={styles.specsTitle}>
              {lang === 'am' ? 'ቴክኒካዊ ዝርዝሮች' : lang === 'om' ? 'Ibsa Tekinikaa' : 'Technical Specifications'}
            </Text>
            {specs.map((spec, i) => (
              <View key={i} style={[styles.specRow, i === specs.length - 1 && styles.specRowLast]}>
                <View style={styles.specLabelRow}>
                  <Ionicons name={spec.icon as any || 'ellipse-outline'} size={14} color="#6B7280" />
                  <Text style={styles.specLabel}>{spec.label}</Text>
                </View>
                <Text style={styles.specValue}>{spec.value}</Text>
              </View>
            ))}
          </View>

          {/* Description */}
          {listing.description && (
            <View style={styles.descSection}>
              <Text style={styles.descLabel}>
                {lang === 'am' ? 'ዝርዝር መግለጫ' : lang === 'om' ? 'Ibsa Bal\'inaa' : 'Description'}
              </Text>
              <Text style={styles.descText}>{listing.description}</Text>
            </View>
          )}

          {/* Seller/Buyer info card */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerHeader}>
              <View style={styles.sellerAvatar}>
                <Ionicons name="business-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.sellerName}>
                    {listing.user?.name || (isBuy ? (lang === 'am' ? 'ገዢ' : 'Buyer') : (lang === 'am' ? 'ሻጭ' : 'Seller'))}
                  </Text>
                  {listing.user?.id && <TrustBadge userId={listing.user.id} />}
                </View>
                <Text style={styles.sellerSubtext}>
                  {isBuy
                    ? (lang === 'am' ? 'ገዢ' : lang === 'om' ? 'Bittaa' : 'Buyer')
                    : (lang === 'am' ? 'አቅራቢ' : lang === 'om' ? 'Dhiyeessaa' : 'Supplier')}
                </Text>
              </View>
              {listing.user?.id && (
                <TouchableOpacity
                  style={styles.viewProfileBtn}
                  onPress={() => router.push(`/user/${listing.user.id}`)}
                >
                  <Text style={styles.viewProfileText}>
                    {lang === 'am' ? 'መገለጫ' : 'Profile'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#1B4332" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* CTAs for non-owner */}
          {currentUser?.id && listing.user?.id && currentUser.id !== listing.user.id && (
            <View style={styles.ctaSection}>
              {/* Primary: Request Quote / Place Order */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push(`/order/create?listingId=${listing.id}`)}
              >
                <Ionicons name="document-text-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  {isBuy
                    ? (lang === 'am' ? 'ጥቅስ ያቅርቡ' : lang === 'om' ? 'Gatii Dhiyeessi' : 'Submit Quote')
                    : (lang === 'am' ? 'ትዕዛዝ ያስገቡ' : lang === 'om' ? 'Ajaja Galchi' : 'Place Order')}
                </Text>
              </TouchableOpacity>

              {/* Secondary: Message */}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push(`/message-compose?listingId=${listing.id}&sellerId=${listing.user.id}`)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#1B4332" />
                <Text style={styles.secondaryBtnText}>
                  {lang === 'am' ? 'መልእክት ላክ' : lang === 'om' ? 'Ergaa Ergi' : 'Message Supplier'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Owner actions */}
          {isOwner && (
            <View style={styles.ownerSection}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push(`/listing/edit/${listing.id}`)}
              >
                <Ionicons name="create-outline" size={18} color="#1B4332" />
                <Text style={styles.editBtnText}>{t('common.edit')} {t('listing.listing')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? <ActivityIndicator size="small" color="#DC2626" />
                  : <Ionicons name="trash-outline" size={18} color="#DC2626" />
                }
                <Text style={styles.deleteBtnText}>
                  {lang === 'am' ? 'ዝርዝር ሰርዝ' : lang === 'om' ? 'Tarree Haqi' : 'Delete Listing'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  contentWrapper: { backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 40 },

  // Gallery
  galleryContainer: { backgroundColor: '#F3F4F6', position: 'relative' },
  galleryImage: { height: 280, backgroundColor: '#E5E7EB' },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  dotActive: { backgroundColor: '#1B4332', width: 20 },
  imageCounter: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  imageCounterText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  // Loading / Error
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 15, color: '#6B7280' },

  // Header
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
  },
  buyBadge:  { backgroundColor: '#EFF6FF' },
  sellBadge: { backgroundColor: '#ECFDF5' },
  typeText:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  buyText:   { color: '#1E40AF' },
  sellText:  { color: '#065F46' },
  postedDate: { fontSize: 12, color: '#9CA3AF' },

  // Title
  title: {
    fontSize: 22, fontWeight: '700', color: '#1A1D21',
    lineHeight: 28, marginBottom: 16, letterSpacing: -0.3,
  },

  // Price
  priceSection: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: '#F0FDF4', borderRadius: 8,
    marginBottom: 20, borderWidth: 1, borderColor: '#BBF7D0',
  },
  priceLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  priceValue: { fontSize: 24, fontWeight: '800', color: '#1B4332', marginLeft: 8 },
  priceUnit: { fontSize: 14, color: '#6B7280', fontWeight: '500' },

  // Specs table
  specsCard: {
    backgroundColor: '#F9FAFB', borderRadius: 8,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  specsTitle: {
    fontSize: 14, fontWeight: '700', color: '#374151',
    marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  specRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  specRowLast: { borderBottomWidth: 0 },
  specLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  specLabel: { fontSize: 13, color: '#6B7280' },
  specValue: { fontSize: 14, fontWeight: '600', color: '#1A1D21', textAlign: 'right', maxWidth: '55%' },

  // Description
  descSection: { marginBottom: 20 },
  descLabel: {
    fontSize: 14, fontWeight: '700', color: '#374151',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  descText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },

  // Seller card
  sellerCard: {
    backgroundColor: '#F9FAFB', borderRadius: 8,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  sellerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1B4332',
    alignItems: 'center', justifyContent: 'center',
  },
  sellerName: { fontSize: 15, fontWeight: '600', color: '#1A1D21' },
  sellerSubtext: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  viewProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, backgroundColor: '#ECFDF5',
  },
  viewProfileText: { fontSize: 12, fontWeight: '600', color: '#1B4332' },

  // CTAs
  ctaSection: { gap: 10, marginBottom: 20 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 8,
    backgroundColor: '#1B4332',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#1B4332', backgroundColor: '#FFFFFF',
    gap: 8, paddingVertical: 14, borderRadius: 8,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#1B4332' },

  // Owner actions
  ownerSection: { gap: 10, marginTop: 8 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#1B4332', backgroundColor: '#FFFFFF',
  },
  editBtnText: { fontSize: 15, fontWeight: '600', color: '#1B4332' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#DC2626', backgroundColor: '#FFFFFF',
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },
});
