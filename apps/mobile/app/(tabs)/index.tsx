import { useState, useCallback } from 'react';
import {
  View, FlatList, Text, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, ScrollView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import ListingCard from '../../components/ListingCard';
import FilterSheet from '../../components/FilterSheet';
import ResponsiveContainer from '../../components/ResponsiveContainer';
import { useResponsive } from '../../hooks/useResponsive';
import { PRODUCT_LABELS } from '../../lib/options';
import { isTelegramMiniApp } from '../../lib/telegram-webapp';
import { getTMATheme } from '../../lib/telegram-theme';

const isTMA = Platform.OS === 'web' && typeof window !== 'undefined' && isTelegramMiniApp();
const theme = isTMA ? getTMATheme() : null;

// ─── Recommended strip (shown only when idle — no search/filters) ─────────────

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
      <Text style={[recStyles.heading, isTMA && { color: theme?.text }]}>{sectionTitle}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={recStyles.row}>
        {recs.map((item: any) => {
          const productLabel = PRODUCT_LABELS[item.productCategory]?.[lang] || item.productCategory;
          const isSell = item.type === 'sell';
          return (
            <TouchableOpacity
              key={item.id}
              style={[recStyles.card, isTMA && { backgroundColor: theme?.card, borderColor: theme?.separator }]}
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
              <Text style={[recStyles.product, isTMA && { color: theme?.text }]}>{productLabel}</Text>
              {item.region && <Text style={[recStyles.region, isTMA && { color: theme?.subtitle }]}>{item.region}</Text>}
              {item.price && (
                <Text style={[recStyles.price, isTMA && { color: theme?.accent }]}>
                  {Number(item.price).toLocaleString()} {item.currency}
                </Text>
              )}
              <Text style={[recStyles.matchReason, isTMA && { color: theme?.hint }]} numberOfLines={2}>{item.matchReason}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { numColumns, isMobile, cardGutter } = useResponsive();

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const isSearching = submittedSearch.length > 0 || Object.keys(filters).length > 0;
  const activeFilterCount = Object.keys(filters).length;

  const feedQuery = useQuery({
    queryKey: ['listings', 'feed', page],
    queryFn: () => api.getListings({ page: String(page), limit: '20' }),
    enabled: !isSearching,
  });

  const searchQuery = useQuery({
    queryKey: ['listings', 'search', submittedSearch, filters],
    queryFn: () => api.getListings({ ...filters, search: submittedSearch, limit: '50' }),
    enabled: isSearching,
  });

  const activeQuery = isSearching ? searchQuery : feedQuery;
  const listings = activeQuery.data?.data || [];
  const total = searchQuery.data?.total || 0;
  const hasMore = !isSearching && (feedQuery.data?.hasMore || false);

  const onRefresh = useCallback(() => {
    setPage(1);
    feedQuery.refetch();
  }, [feedQuery]);

  const handleSearchSubmit = () => setSubmittedSearch(search);

  const handleClearSearch = () => {
    setSearch('');
    setSubmittedSearch('');
  };

  const handleApplyFilters = (f: Record<string, string>) => {
    setFilters(f);
    setPage(1);
  };

  // TMA: tighter gutter
  const gutter = isTMA ? 6 : cardGutter;

  const ListHeader = (
    <>
      {/* Search bar */}
      <View style={[
        styles.searchRow,
        isTMA && {
          backgroundColor: theme?.bg,
          borderBottomColor: theme?.separator,
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 8,
        },
      ]}>
        <View style={[
          styles.searchBox,
          isTMA && {
            backgroundColor: theme?.secondaryBg,
            borderRadius: 12,
            paddingHorizontal: 10,
          },
        ]}>
          <Ionicons name="search-outline" size={16} color={isTMA ? theme?.hint : '#999'} />
          <TextInput
            style={[
              styles.searchInput,
              isTMA && {
                fontSize: 14,
                paddingVertical: 8,
                color: theme?.text,
              },
            ]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={isTMA ? theme?.hint : '#999'}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={16} color={isTMA ? theme?.hint : '#999'} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            isTMA && {
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: theme?.secondaryBg,
            },
            activeFilterCount > 0 && (isTMA
              ? { backgroundColor: theme?.accent + '18' }
              : styles.filterBtnActive
            ),
          ]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount > 0 ? (isTMA ? theme?.accent : '#2E7D32') : (isTMA ? theme?.hint : '#666')}
          />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, isTMA && { backgroundColor: theme?.accent }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Result count (search mode) */}
      {isSearching && (
        <Text style={[styles.resultCount, isTMA && { color: theme?.hint }]}>
          {total} {t('search.results')}
        </Text>
      )}

      {/* Recommendations (idle mode, logged-in users only) */}
      {!isSearching && token && <RecommendedSection />}
    </>
  );

  return (
    <ResponsiveContainer
      style={[styles.container, isTMA && { backgroundColor: theme?.secondaryBg }]}
      size="feed"
    >
      <FlatList
        key={`cols-${numColumns}`}
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <View style={{ flex: 1, margin: gutter / 2, alignSelf: 'flex-start' }}>
            <ListingCard listing={item} />
          </View>
        )}
        contentContainerStyle={[styles.list, { paddingHorizontal: gutter / 2 }, isTMA && { paddingBottom: 60 }]}
        columnWrapperStyle={{ paddingHorizontal: gutter / 2, alignItems: 'flex-start' }}
        ListHeaderComponent={ListHeader}
        refreshControl={
          !isSearching
            ? <RefreshControl
                refreshing={feedQuery.isRefetching}
                onRefresh={onRefresh}
                tintColor={isTMA ? theme?.accent : '#2E7D32'}
              />
            : undefined
        }
        ListEmptyComponent={
          activeQuery.isLoading ? (
            <ActivityIndicator size="large" color={isTMA ? theme?.accent : '#2E7D32'} style={styles.loader} />
          ) : (
            <View style={styles.empty}>
              {isSearching && <Ionicons name="search-outline" size={44} color={isTMA ? theme?.separator : '#ddd'} />}
              <Text style={[styles.emptyText, isTMA && { color: theme?.hint }]}>
                {isSearching ? t('common.noResults') : t('listing.noListings')}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              style={[
                styles.loadMore,
                isTMA && {
                  backgroundColor: theme?.card,
                  borderColor: theme?.separator,
                },
              ]}
              onPress={() => setPage((p) => p + 1)}
            >
              <Text style={[styles.loadMoreText, isTMA && { color: theme?.accent }]}>
                {t('common.loadMore')}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />
    </ResponsiveContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const recStyles = StyleSheet.create({
  section: { paddingTop: 10, paddingBottom: 4 },
  heading: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', paddingHorizontal: 14, marginBottom: 8 },
  row: { paddingHorizontal: 12, gap: 8 },
  card: {
    width: 148, backgroundColor: '#fff', borderRadius: 12, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    borderWidth: 1, borderColor: '#E8F5E9',
  },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 5 },
  sellBadge: { backgroundColor: '#FFF3E0' },
  buyBadge: { backgroundColor: '#E8F5E9' },
  typeText: { fontSize: 9, fontWeight: '700', color: '#333' },
  product: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  region: { fontSize: 11, color: '#666', marginBottom: 2 },
  price: { fontSize: 12, fontWeight: '700', color: '#2E7D32', marginBottom: 4 },
  matchReason: { fontSize: 10, color: '#888', lineHeight: 14 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingHorizontal: 12, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10, color: '#1a1a1a' },
  filterBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: '#E8F5E9' },
  filterBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#2E7D32', borderRadius: 8,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  resultCount: { fontSize: 12, color: '#666', paddingHorizontal: 14, paddingTop: 6 },
  list: { paddingTop: 4, paddingBottom: 80 },
  loader: { marginTop: 60 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10, paddingHorizontal: 24 },
  emptyText: { fontSize: 15, color: '#999' },
  loadMore: {
    paddingVertical: 12, marginHorizontal: 14, marginVertical: 8,
    backgroundColor: '#fff', borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
});
