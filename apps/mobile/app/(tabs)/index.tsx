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
import { CATEGORY_GROUPS, CategoryGroup } from '../../lib/options';

// ─── Category navigation strip ──────────────────────────────────────────────

function CategoryStrip({
  selected,
  onSelect,
  lang,
}: {
  selected: string | null;
  onSelect: (key: string | null) => void;
  lang: 'en' | 'am' | 'om';
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={catStyles.row}
      style={catStyles.container}
    >
      {/* All */}
      <TouchableOpacity
        style={[catStyles.chip, !selected && catStyles.chipActive]}
        onPress={() => onSelect(null)}
      >
        <Ionicons name="apps-outline" size={14} color={!selected ? '#1B4332' : '#6B7280'} />
        <Text style={[catStyles.chipText, !selected && catStyles.chipTextActive]}>
          {lang === 'am' ? 'ሁሉም' : lang === 'om' ? 'Hunda' : 'All'}
        </Text>
      </TouchableOpacity>

      {CATEGORY_GROUPS.map((cat) => {
        const isActive = selected === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            style={[catStyles.chip, isActive && catStyles.chipActive]}
            onPress={() => onSelect(isActive ? null : cat.key)}
          >
            <Ionicons name={cat.icon as any} size={14} color={isActive ? '#1B4332' : '#6B7280'} />
            <Text style={[catStyles.chipText, isActive && catStyles.chipTextActive]}>
              {cat[lang]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const catStyles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  row: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#1B4332',
  },
  chipText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  chipTextActive: { color: '#1B4332', fontWeight: '600' },
});

// ─── Sort selector ───────────────────────────────────────────────────────────

type SortOption = 'newest' | 'price_asc' | 'price_desc';

function SortBar({
  sort,
  onSort,
  total,
  lang,
}: {
  sort: SortOption;
  onSort: (s: SortOption) => void;
  total?: number;
  lang: 'en' | 'am' | 'om';
}) {
  const options: { value: SortOption; label: string }[] = [
    { value: 'newest', label: lang === 'am' ? 'አዲስ' : lang === 'om' ? 'Haaraa' : 'Newest' },
    { value: 'price_asc', label: lang === 'am' ? 'ዋጋ ↑' : lang === 'om' ? 'Gatii ↑' : 'Price ↑' },
    { value: 'price_desc', label: lang === 'am' ? 'ዋጋ ↓' : lang === 'om' ? 'Gatii ↓' : 'Price ↓' },
  ];

  return (
    <View style={sortStyles.bar}>
      {total !== undefined && (
        <Text style={sortStyles.resultCount}>
          {total} {lang === 'am' ? 'ውጤቶች' : lang === 'om' ? 'bu\'aa' : 'results'}
        </Text>
      )}
      <View style={sortStyles.pills}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[sortStyles.pill, sort === opt.value && sortStyles.pillActive]}
            onPress={() => onSort(opt.value)}
          >
            <Text style={[sortStyles.pillText, sort === opt.value && sortStyles.pillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const sortStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resultCount: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  pills: { flexDirection: 'row', gap: 4 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  pillText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const { isMobile, cardGutter } = useResponsive();
  const lang = i18n.language as 'en' | 'am' | 'om';

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [typeTab, setTypeTab] = useState<'all' | 'sell' | 'buy'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('newest');

  const isSearching = submittedSearch.length > 0 || Object.keys(filters).length > 0;
  const activeFilterCount = Object.keys(filters).length + (selectedCategory ? 1 : 0);

  const typeParam = typeTab !== 'all' ? { type: typeTab } : {};

  // Map selected category group → productCategory filter
  const categoryFilter: Record<string, string> = {};
  if (selectedCategory) {
    const group = CATEGORY_GROUPS.find(g => g.key === selectedCategory);
    if (group) {
      // Use first product as filter; API can be extended for multi-value later
      // For now pass the category group key — backend can interpret or we filter client-side
      categoryFilter.productCategory = group.products.join(',');
    }
  }

  // Feed mode: plain paginated feed
  const feedQuery = useQuery({
    queryKey: ['listings', 'feed', page, typeTab, selectedCategory, sort],
    queryFn: () => api.getListings({ page: String(page), limit: '20', ...typeParam, ...categoryFilter }),
    enabled: !isSearching,
  });

  // Search mode: filtered results
  const searchQuery = useQuery({
    queryKey: ['listings', 'search', submittedSearch, filters, typeTab, sort],
    queryFn: () => api.getListings({ ...filters, search: submittedSearch, limit: '50', ...typeParam }),
    enabled: isSearching,
  });

  const activeQuery = isSearching ? searchQuery : feedQuery;
  let listings = activeQuery.data?.data || [];
  const total = activeQuery.data?.total || listings.length;
  const hasMore = !isSearching && (feedQuery.data?.hasMore || false);

  // Client-side sort (until backend supports sort param)
  if (sort === 'price_asc') {
    listings = [...listings].sort((a: any, b: any) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (sort === 'price_desc') {
    listings = [...listings].sort((a: any, b: any) => (Number(b.price) || 0) - (Number(a.price) || 0));
  }

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

  const handleCategorySelect = (key: string | null) => {
    setSelectedCategory(key);
    setPage(1);
  };

  const ListHeader = (
    <>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={lang === 'am' ? 'ምርት, ክልል, ሻጭ ፈልግ...' : lang === 'om' ? 'Oomisha, naannoo, barbaadi...' : 'Search products, regions, suppliers...'}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#1B4332' : '#6B7280'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category navigation */}
      <CategoryStrip
        selected={selectedCategory}
        onSelect={handleCategorySelect}
        lang={lang}
      />

      {/* Type toggle: All / Suppliers / Buyers */}
      <View style={styles.typeToggleRow}>
        {(['all', 'sell', 'buy'] as const).map((tab) => {
          const label =
            tab === 'all'  ? (lang === 'am' ? 'ሁሉም' : lang === 'om' ? 'Hunda' : 'All Listings') :
            tab === 'sell' ? (lang === 'am' ? 'አቅራቢዎች' : lang === 'om' ? 'Dhiyeessitootaa' : 'Suppliers') :
                             (lang === 'am' ? 'ገዢዎች' : lang === 'om' ? 'Bittootaa' : 'Buyers');
          const isActive = typeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.typeTab, isActive && styles.typeTabActive]}
              onPress={() => handleTypeTab(tab)}
            >
              <Text style={[styles.typeTabText, isActive && styles.typeTabTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sort bar */}
      <SortBar
        sort={sort}
        onSort={setSort}
        total={isSearching ? total : undefined}
        lang={lang}
      />
    </>
  );

  return (
    <ResponsiveContainer style={styles.container} size="feed">
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ListingCard listing={item} />
          </View>
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={ListHeader}
        refreshControl={
          !isSearching
            ? <RefreshControl refreshing={feedQuery.isRefetching} onRefresh={onRefresh} tintColor="#1B4332" />
            : undefined
        }
        ListEmptyComponent={
          activeQuery.isLoading ? (
            <ActivityIndicator size="large" color="#1B4332" style={styles.loader} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {isSearching
                  ? (lang === 'am' ? 'ምንም ውጤት አልተገኘም' : lang === 'om' ? 'Bu\'aan hin argamne' : 'No results found')
                  : (lang === 'am' ? 'ምንም ዝርዝሮች የሉም' : lang === 'om' ? 'Tarreen hin jiru' : 'No listings available')}
              </Text>
              <Text style={styles.emptyHint}>
                {isSearching
                  ? (lang === 'am' ? 'ማጣሪያዎን ያስተካክሉ' : lang === 'om' ? 'Filannoo kee sirreessi' : 'Try adjusting your filters or search terms')
                  : (lang === 'am' ? 'በኋላ ይመለሱ' : lang === 'om' ? 'Booda deebi\'i' : 'Check back later for new listings')}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  // Search bar
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10, color: '#1A1D21' },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnActive: { backgroundColor: '#ECFDF5', borderColor: '#1B4332' },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#1B4332',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  // Type toggle
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  typeTabActive: {
    borderBottomColor: '#1B4332',
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  typeTabTextActive: {
    color: '#1B4332',
    fontWeight: '600',
  },

  // Feed
  list: { paddingTop: 0, paddingBottom: 80 },
  cardWrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  loader: { marginTop: 60 },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  emptyHint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  loadMore: {
    paddingVertical: 14,
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: '#1B4332' },
});
