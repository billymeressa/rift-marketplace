import { useState, useCallback } from 'react';
import {
  View, FlatList, Text, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import ListingCard from '../../components/ListingCard';
import ResponsiveContainer from '../../components/ResponsiveContainer';
import { PRODUCT_LABELS } from '../../lib/options';

function RecommendedSection() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n.language as 'en' | 'am' | 'om';

  const { data } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.getRecommendations(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const recs = data?.data || [];
  if (recs.length === 0) return null;

  const sectionTitle =
    lang === 'am' ? 'ለእርስዎ የሚመከሩ' : lang === 'om' ? 'Sif Yaadame' : 'Recommended for You';

  return (
    <View style={recStyles.section}>
      <Text style={recStyles.heading}>{sectionTitle}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={recStyles.row}>
        {recs.map((item: any) => {
          const productLabel = PRODUCT_LABELS[item.productCategory]?.[lang] || item.productCategory;
          const isSell = item.type === 'sell';
          return (
            <TouchableOpacity
              key={item.id}
              style={recStyles.card}
              onPress={() => router.push(`/listing/${item.id}`)}
              activeOpacity={0.75}
            >
              <View style={[recStyles.typeBadge, isSell ? recStyles.sellBadge : recStyles.buyBadge]}>
                <Text style={recStyles.typeText}>
                  {isSell
                    ? (lang === 'am' ? 'ሽያጭ' : lang === 'om' ? 'GURGURTAA' : 'SELL')
                    : (lang === 'am' ? 'ግዢ' : lang === 'om' ? 'BITTAA' : 'BUY')}
                </Text>
              </View>
              <Text style={recStyles.product}>{productLabel}</Text>
              {item.region && <Text style={recStyles.region}>{item.region}</Text>}
              {item.price && (
                <Text style={recStyles.price}>
                  {Number(item.price).toLocaleString()} {item.currency}
                </Text>
              )}
              <Text style={recStyles.matchReason} numberOfLines={2}>{item.matchReason}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['listings', 'feed', page],
    queryFn: () => api.getListings({ page: String(page), limit: '20' }),
  });

  const listings = data?.data || [];
  const hasMore = data?.hasMore || false;

  const onRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const header = token ? <RecommendedSection /> : null;

  return (
    <ResponsiveContainer style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#2E7D32" />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#2E7D32" style={styles.loader} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('listing.noListings')}</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              style={styles.loadMore}
              onPress={() => setPage((p) => p + 1)}
            >
              <Text style={styles.loadMoreText}>{t('common.loadMore')}</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </ResponsiveContainer>
  );
}

const recStyles = StyleSheet.create({
  section: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  sellBadge: { backgroundColor: '#FFF3E0' },
  buyBadge: { backgroundColor: '#E8F5E9' },
  typeText: { fontSize: 10, fontWeight: '700', color: '#333' },
  product: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  region: { fontSize: 12, color: '#666', marginBottom: 2 },
  price: { fontSize: 13, fontWeight: '700', color: '#2E7D32', marginBottom: 6 },
  matchReason: { fontSize: 11, color: '#888', lineHeight: 15 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  list: {
    paddingTop: 8,
    paddingBottom: 80,
  },
  loader: {
    marginTop: 60,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  loadMore: {
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
});
