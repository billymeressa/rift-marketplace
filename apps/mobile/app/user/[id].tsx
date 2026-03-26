import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, apiRequest } from '../../lib/api';
import TrustBadge from '../../components/TrustBadge';
import StarRating from '../../components/StarRating';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const { data: trust, isLoading: trustLoading } = useQuery({
    queryKey: ['userTrust', id],
    queryFn: () => api.getUserTrust(id!),
    enabled: !!id,
  });

  const { data: verification, isLoading: verificationLoading } = useQuery({
    queryKey: ['userVerification', id],
    queryFn: () => api.getUserVerification(id!),
    enabled: !!id,
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['userReviews', id],
    queryFn: () => api.getUserReviews(id!),
    enabled: !!id,
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['userListings', id],
    queryFn: () => apiRequest<any>(`/users/${id}/listings`),
    enabled: !!id,
  });

  const isLoading = trustLoading || verificationLoading;

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  const userName = trust?.name || trust?.phone || t('profile.name');
  const userPhone = trust?.phone || '';
  const avatarLetter = (userName || '?')[0].toUpperCase();

  const reviewList = reviews?.data || reviews || [];
  const avgRating = trust?.avgRating ?? 0;
  const totalReviews = reviewList.length ?? 0;

  const listingList = listings?.data || listings || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top section: Avatar, name, phone */}
      <View style={styles.topSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <Text style={styles.name}>{userName}</Text>
      </View>

      {/* Trust Badge */}
      {id && (
        <View style={styles.trustSection}>
          <TrustBadge userId={id} size="large" />
        </View>
      )}

      {/* Verification section */}
      {verification && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('verification.title')}</Text>
          <View style={styles.verificationCard}>
            {verification.businessName && (
              <Text style={styles.verificationName}>
                {verification.businessName}
              </Text>
            )}
            {verification.businessType && (
              <Text style={styles.verificationDetail}>
                {verification.businessType}
              </Text>
            )}
            {verification.status === 'verified' && (
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={18} color="#1B4332" />
                <Text style={styles.verifiedLabel}>
                  {t('verification.verifiedBadge')}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Reviews section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('review.reviews')}</Text>
        <View style={styles.ratingOverview}>
          <StarRating rating={Math.round(avgRating)} size={24} />
          <Text style={styles.ratingText}>
            {avgRating > 0 ? avgRating.toFixed(1) : '-'}
          </Text>
          <Text style={styles.reviewCount}>
            ({totalReviews} {t('trust.totalReviews').toLowerCase()})
          </Text>
        </View>

        {reviewsLoading ? (
          <ActivityIndicator size="small" color="#1B4332" style={styles.inlineLoader} />
        ) : totalReviews === 0 ? (
          <Text style={styles.emptyText}>{t('review.noReviews')}</Text>
        ) : (
          reviewList.map((review: any, index: number) => (
            <View key={review.id || index} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>
                  {review.reviewer?.name || review.reviewerName || t('profile.name')}
                </Text>
                <StarRating rating={review.rating} size={14} />
              </View>
              {review.comment ? (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              ) : null}
              {review.createdAt ? (
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      {/* Active Listings section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('listing.myListings')}</Text>
        {listingsLoading ? (
          <ActivityIndicator size="small" color="#1B4332" style={styles.inlineLoader} />
        ) : listingList.length === 0 ? (
          <Text style={styles.emptyText}>{t('listing.noListings')}</Text>
        ) : (
          listingList.map((item: any) => (
            <View key={item.id} style={styles.listingCard}>
              <Text style={styles.listingTitle}>{item.title}</Text>
              <View style={styles.listingMeta}>
                {item.productCategory && (
                  <Text style={styles.listingBadge}>{item.productCategory}</Text>
                )}
                {item.price != null && (
                  <Text style={styles.listingPrice}>
                    {item.price.toLocaleString()} {item.currency || 'ETB'}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    paddingBottom: 40,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1B4332',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1D21',
  },
  phone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  trustSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 8,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D21',
    marginBottom: 12,
  },
  verificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  verificationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1D21',
  },
  verificationDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  verifiedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B4332',
  },
  ratingOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D21',
  },
  reviewCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewComment: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  inlineLoader: {
    marginTop: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1D21',
    marginBottom: 6,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listingBadge: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  listingPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B4332',
  },
});
