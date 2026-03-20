import { useState, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import ListingCard from '../../components/ListingCard';
import ResponsiveContainer from '../../components/ResponsiveContainer';

export default function HomeScreen() {
  const { t } = useTranslation();
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

  return (
    <ResponsiveContainer style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={styles.list}
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
