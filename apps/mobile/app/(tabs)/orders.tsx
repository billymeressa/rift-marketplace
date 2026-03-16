import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import OrderCard from '../../components/OrderCard';

type RoleTab = 'buyer' | 'seller';

export default function OrdersScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [role, setRole] = useState<RoleTab>('buyer');
  const [page, setPage] = useState(1);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['orders', role, page],
    queryFn: () =>
      api.getOrders({ role, page: String(page), limit: '20' }),
  });

  const orders = data?.orders ?? data?.data ?? (Array.isArray(data) ? data : []);
  const hasMore = data?.hasMore ?? false;

  const handleRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const handleLoadMore = () => {
    if (hasMore) {
      setPage((p) => p + 1);
    }
  };

  const handleTabChange = (newRole: RoleTab) => {
    setRole(newRole);
    setPage(1);
  };

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <OrderCard order={item} />
    ),
    [],
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="receipt-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>{t('order.noOrders')}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
        <Text style={styles.loadMoreText}>{t('common.loadMore')}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Segmented control */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, role === 'buyer' && styles.tabBtnActive]}
          onPress={() => handleTabChange('buyer')}
        >
          <Text
            style={[styles.tabText, role === 'buyer' && styles.tabTextActive]}
          >
            {t('order.asBuyer')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, role === 'seller' && styles.tabBtnActive]}
          onPress={() => handleTabChange('seller')}
        >
          <Text
            style={[styles.tabText, role === 'seller' && styles.tabTextActive]}
          >
            {t('order.asSeller')}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && !isRefetching ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshing={isRefetching}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tabBtnActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#2E7D32',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
});
