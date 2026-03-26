import { useState, useCallback } from 'react';
import {
  View, FlatList, Text, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, ScrollView,
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const { numColumns, isMobile, cardGutter } = useResponsive();

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [typeTab, setTypeTab] = useState<'all' | 'sell' | 'buy'>('all');

  const isSearching = submittedSearch.length > 0 || Object.keys(filters).length > 0;
  const activeFilterCount = Object.keys(filters).length;

  const typeParam = typeTab !== 'all' ? { type: typeTab } : {};

  // Feed mode: plain paginated feed
  const feedQuery = useQuery({
    queryKey: ['listings', 'feed', page, typeTab],
    queryFn: () => api.getListings({ page: String(page), limit: '20', ...typeParam }),
    enabled: !isSearching,
  });

  // Search mode: filtered results (no pagination needed, API returns top matches)
  const searchQuery = useQuery({
    queryKey: ['listings', 'search', submittedSearch, filters, typeTab],
    queryFn: () => api.getListings({ ...filters, search: submittedSearch, limit: '50', ...typeParam }),
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

  const handleTypeTab = (tab: 'all' | 'sell' | 'buy') => {
    setTypeTab(tab);
    setPage(1);
  };

  const ListHeader = (
    <>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#2E7D32' : '#666'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Type toggle */}
      <View style={styles.typeToggleRow}>
        {(['all', 'sell', 'buy'] as const).map((tab) => {
          const label =
            tab === 'all'  ? (i18n.language === 'am' ? 'ሁሉም' : i18n.language === 'om' ? 'Hunda' : 'All') :
            tab === 'sell' ? (i18n.language === 'am' ? 'ለሽያጭ' : i18n.language === 'om' ? 'Gurguramaa' : 'For Sale') :
                             (i18n.language === 'am' ? 'ፈልጓል' : i18n.language === 'om' ? 'Barbaada' : 'Wanted');
          const isActive = typeTab === tab;
          const color = tab === 'sell' ? '#2E7D32' : tab === 'buy' ? '#E65100' : '#555';
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.typeTab, isActive && { borderBottomColor: color, borderBottomWidth: 2.5 }]}
              onPress={() => handleTypeTab(tab)}
            >
              <Text style={[styles.typeTabText, isActive && { color, fontWeight: '700' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Result count (search mode) */}
      {isSearching && (
        <Text style={styles.resultCount}>{total} {t('search.results')}</Text>
      )}

      {/* Recommendations (idle mode, logged-in users only) */}
      {!isSearching && token && <RecommendedSection />}
    </>
  );

  return (
    <ResponsiveContainer style={styles.container} size="feed">
      <FlatList
        key={`cols-${numColumns}`}
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <View style={{ flex: 1, marginHorizontal: cardGutter / 2, marginBottom: 2, alignSelf: 'flex-start' }}>
            <ListingCard listing={item} />
          </View>
        )}
        contentContainerStyle={[styles.list, { paddingHorizontal: cardGutter / 2 }]}
        columnWrapperStyle={{ paddingHorizontal: cardGutter / 2, alignItems: 'flex-start' }}
        ListHeaderComponent={ListHeader}
        refreshControl={
          !isSearching
            ? <RefreshControl refreshing={feedQuery.isRefetching} onRefresh={onRefresh} tintColor="#2E7D32" />
            : undefined
        }
        ListEmptyComponent={
          activeQuery.isLoading ? (
            <ActivityIndicator size="large" color="#2E7D32" style={styles.loader} />
          ) : (
            <View style={styles.empty}>
              {isSearching && <Ionicons name="search-outline" size={48} color="#ddd" />}
              <Text style={styles.emptyText}>
                {isSearching ? t('common.noResults') : t('listing.noListings')}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity style={styles.loadMore} onPress={() => setPage((p) => p + 1)}>
              <Text style={styles.loadMoreText}>{t('common.loadMore')}</Text>
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
  section: { paddingTop: 12, paddingBottom: 4 },
  heading: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', paddingHorizontal: 16, marginBottom: 10 },
  row: { paddingHorizontal: 16, gap: 10 },
  card: {
    width: 160, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
    borderWidth: 1, borderColor: '#E8F5E9',
  },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, marginBottom: 6 },
  sellBadge: { backgroundColor: '#FFF3E0' },
  buyBadge: { backgroundColor: '#E8F5E9' },
  typeText: { fontSize: 10, fontWeight: '700', color: '#333' },
  product: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  region: { fontSize: 12, color: '#666', marginBottom: 2 },
  price: { fontSize: 13, fontWeight: '700', color: '#2E7D32', marginBottom: 6 },
  matchReason: { fontSize: 11, color: '#888', lineHeight: 15 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  // Search bar
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
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  resultCount: { fontSize: 13, color: '#666', paddingHorizontal: 16, paddingTop: 8 },
  // Feed
  list: { paddingTop: 4, paddingBottom: 80 },
  loader: { marginTop: 60 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12, paddingHorizontal: 24 },
  emptyText: { fontSize: 16, color: '#999' },
  loadMore: {
    paddingVertical: 14, marginHorizontal: 16, marginVertical: 8,
    backgroundColor: '#fff', borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
});
