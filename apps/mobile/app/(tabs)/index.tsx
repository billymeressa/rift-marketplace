import { useState, useCallback, useRef } from 'react';
import {
  View, FlatList, Text, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, ScrollView,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import ListingCard from '../../components/ListingCard';
import FilterSheet from '../../components/FilterSheet';
import ResponsiveContainer from '../../components/ResponsiveContainer';
import { CATEGORY_GROUPS } from '../../lib/options';

// Height of the collapsible secondary bar (measured values)
// CategoryStrip: 56  |  TypeToggle: 42  |  SortBar: 44  = 142
const SECONDARY_HEIGHT = 142;

// Scroll thresholds
const HIDE_THRESHOLD  = 6;   // px downward before collapsing
const SHOW_THRESHOLD  = 4;   // px upward before expanding
const TOP_SNAP        = 12;  // always expand when near top

// ─── Category navigation strip ───────────────────────────────────────────────

function CategoryStrip({
  selected, onSelect, lang,
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
      // prevent nested scroll stealing from parent FlatList on web
      nestedScrollEnabled
    >
      <TouchableOpacity
        style={[catStyles.chip, !selected && catStyles.chipActive]}
        onPress={() => onSelect(null)}
      >
        <Ionicons name="apps-outline" size={13} color={!selected ? '#1B4332' : '#6B7280'} />
        <Text style={[catStyles.chipText, !selected && catStyles.chipTextActive]}>
          {lang === 'am' ? 'ሁሉም' : lang === 'om' ? 'Hunda' : 'All'}
        </Text>
      </TouchableOpacity>

      {CATEGORY_GROUPS.map((cat) => {
        const active = selected === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            style={[catStyles.chip, active && catStyles.chipActive]}
            onPress={() => onSelect(active ? null : cat.key)}
          >
            <Ionicons name={cat.icon as any} size={13} color={active ? '#1B4332' : '#6B7280'} />
            <Text style={[catStyles.chipText, active && catStyles.chipTextActive]}>
              {cat[lang]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const catStyles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF' },
  row: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#F3F4F6',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#ECFDF5', borderColor: '#1B4332' },
  chipText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  chipTextActive: { color: '#1B4332', fontWeight: '600' },
});

// ─── Sort / results bar ───────────────────────────────────────────────────────

type SortOption = 'newest' | 'price_asc' | 'price_desc';

function SortBar({
  sort, onSort, total, lang,
}: {
  sort: SortOption;
  onSort: (s: SortOption) => void;
  total?: number;
  lang: 'en' | 'am' | 'om';
}) {
  const options: { value: SortOption; label: string }[] = [
    { value: 'newest',     label: lang === 'am' ? 'አዲስ'  : lang === 'om' ? 'Haaraa' : 'Newest' },
    { value: 'price_asc',  label: lang === 'am' ? 'ዋጋ ↑' : lang === 'om' ? 'Gatii ↑' : 'Price ↑' },
    { value: 'price_desc', label: lang === 'am' ? 'ዋጋ ↓' : lang === 'om' ? 'Gatii ↓' : 'Price ↓' },
  ];
  return (
    <View style={sortStyles.bar}>
      <Text style={sortStyles.count}>
        {total !== undefined
          ? `${total} ${lang === 'am' ? 'ውጤቶች' : lang === 'om' ? "bu'aa" : 'results'}`
          : ''}
      </Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  count:       { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  pills:       { flexDirection: 'row', gap: 4 },
  pill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  pillActive:     { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  pillText:       { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'am' | 'om';

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search,          setSearch]          = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [filters,         setFilters]         = useState<Record<string, string>>({});
  const [showFilters,     setShowFilters]     = useState(false);
  const [page,            setPage]            = useState(1);
  const [typeTab,         setTypeTab]         = useState<'all' | 'sell' | 'buy'>('all');
  const [selectedCat,     setSelectedCat]     = useState<string | null>(null);
  const [sort,            setSort]            = useState<SortOption>('newest');

  const isSearching      = submittedSearch.length > 0 || Object.keys(filters).length > 0;
  const activeFilterCount = Object.keys(filters).length + (selectedCat ? 1 : 0);
  const typeParam         = typeTab !== 'all' ? { type: typeTab } : {};

  const categoryFilter: Record<string, string> = {};
  if (selectedCat) {
    const group = CATEGORY_GROUPS.find(g => g.key === selectedCat);
    if (group) categoryFilter.productCategory = group.products.join(',');
  }

  // ── Data queries ─────────────────────────────────────────────────────────────
  const feedQuery = useQuery({
    queryKey: ['listings', 'feed', page, typeTab, selectedCat],
    queryFn:  () => api.getListings({ page: String(page), limit: '20', ...typeParam, ...categoryFilter }),
    enabled:  !isSearching,
  });

  const searchQuery = useQuery({
    queryKey: ['listings', 'search', submittedSearch, filters, typeTab],
    queryFn:  () => api.getListings({ ...filters, search: submittedSearch, limit: '50', ...typeParam }),
    enabled:  isSearching,
  });

  const activeQuery = isSearching ? searchQuery : feedQuery;
  let listings       = activeQuery.data?.data || [];
  const total        = activeQuery.data?.total ?? listings.length;
  const hasMore      = !isSearching && (feedQuery.data?.hasMore ?? false);

  if (sort === 'price_asc')
    listings = [...listings].sort((a: any, b: any) => (Number(a.price)||0) - (Number(b.price)||0));
  if (sort === 'price_desc')
    listings = [...listings].sort((a: any, b: any) => (Number(b.price)||0) - (Number(a.price)||0));

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const onRefresh = useCallback(() => { setPage(1); feedQuery.refetch(); }, [feedQuery]);

  // ── Sticky-header animation ───────────────────────────────────────────────────
  // secondaryAnim: 1 = fully open, 0 = fully collapsed
  const secondaryAnim     = useRef(new Animated.Value(1)).current;
  const isVisible         = useRef(true);
  const lastScrollY       = useRef(0);

  const openSecondary = useCallback(() => {
    if (isVisible.current) return;
    isVisible.current = true;
    Animated.timing(secondaryAnim, {
      toValue: 1, duration: 220,
      useNativeDriver: false,
    }).start();
  }, [secondaryAnim]);

  const closeSecondary = useCallback(() => {
    if (!isVisible.current) return;
    isVisible.current = false;
    Animated.timing(secondaryAnim, {
      toValue: 0, duration: 180,
      useNativeDriver: false,
    }).start();
  }, [secondaryAnim]);

  const handleScroll = useCallback((e: any) => {
    const y  = e.nativeEvent.contentOffset.y;
    const dy = y - lastScrollY.current;
    lastScrollY.current = y;

    if (y < TOP_SNAP)      { openSecondary();  return; }
    if (dy >  HIDE_THRESHOLD) closeSecondary();
    else if (dy < -SHOW_THRESHOLD) openSecondary();
  }, [openSecondary, closeSecondary]);

  // Interpolated secondary height + opacity
  const secondaryMaxHeight = secondaryAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, SECONDARY_HEIGHT],
  });
  const secondaryOpacity = secondaryAnim.interpolate({
    inputRange:  [0, 0.6, 1],
    outputRange: [0, 0,   1],
  });
  // Search bar shadow deepens when secondary is hidden (gives depth cue)
  const searchElevation = secondaryAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [6, 0],
  });
  const searchShadowOpacity = secondaryAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0.12, 0.04],
  });

  return (
    <ResponsiveContainer style={styles.container} size="feed">

      {/* ── STICKY SEARCH BAR ─────────────────────────────────────────────── */}
      <Animated.View style={[
        styles.stickySearch,
        {
          shadowOpacity: searchShadowOpacity,
          elevation:     searchElevation,
        },
      ]}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder={
                lang === 'am' ? 'ምርት, ክልል, ሻጭ ፈልግ...' :
                lang === 'om' ? 'Oomisha, naannoo, barbaadi...' :
                'Search products, regions, suppliers...'
              }
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => setSubmittedSearch(search)}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); setSubmittedSearch(''); }}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeFilterCount > 0 ? '#1B4332' : '#6B7280'}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── COLLAPSIBLE SECONDARY BAR ─────────────────────────────────────── */}
      <Animated.View style={[
        styles.secondaryWrap,
        { maxHeight: secondaryMaxHeight, opacity: secondaryOpacity },
      ]}>
        {/* Category chips */}
        <CategoryStrip
          selected={selectedCat}
          onSelect={(k) => { setSelectedCat(k); setPage(1); }}
          lang={lang}
        />

        {/* Type toggle: All / Suppliers / Buyers */}
        <View style={styles.typeToggleRow}>
          {(['all', 'sell', 'buy'] as const).map((tab) => {
            const label =
              tab === 'all'  ? (lang === 'am' ? 'ሁሉም'      : lang === 'om' ? 'Hunda'          : 'All Listings') :
              tab === 'sell' ? (lang === 'am' ? 'አቅራቢዎች'  : lang === 'om' ? 'Dhiyeessitootaa' : 'Suppliers') :
                               (lang === 'am' ? 'ገዢዎች'     : lang === 'om' ? 'Bittootaa'       : 'Buyers');
            const active = typeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.typeTab, active && styles.typeTabActive]}
                onPress={() => { setTypeTab(tab); setPage(1); }}
              >
                <Text style={[styles.typeTabText, active && styles.typeTabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sort + result count */}
        <SortBar
          sort={sort}
          onSort={setSort}
          total={isSearching ? total : undefined}
          lang={lang}
        />
      </Animated.View>

      {/* ── LISTING FEED ──────────────────────────────────────────────────── */}
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ListingCard listing={item} />
          </View>
        )}
        contentContainerStyle={styles.list}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
                  ? (lang === 'am' ? 'ምንም ውጤት አልተገኘም' : lang === 'om' ? "Bu'aan hin argamne" : 'No results found')
                  : (lang === 'am' ? 'ምንም ዝርዝሮች የሉም'   : lang === 'om' ? 'Tarreen hin jiru'   : 'No listings available')}
              </Text>
              <Text style={styles.emptyHint}>
                {isSearching
                  ? (lang === 'am' ? 'ማጣሪያዎን ያስተካክሉ'  : lang === 'om' ? 'Filannoo kee sirreessi' : 'Try adjusting your filters or search terms')
                  : (lang === 'am' ? 'በኋላ ይመለሱ'        : lang === 'om' ? "Booda deebi'i"          : 'Check back later for new listings')}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity style={styles.loadMore} onPress={() => setPage(p => p + 1)}>
              <Text style={styles.loadMoreText}>{t('common.loadMore')}</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={(f) => { setFilters(f); setPage(1); }}
      />
    </ResponsiveContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  // ── Sticky search ──────────────────────────────────────────────────────────
  stickySearch: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    // shadow — interpolated via Animated.View props above
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
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
  searchInput:   { flex: 1, fontSize: 14, paddingVertical: 10, color: '#1A1D21' },
  filterBtn: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterBtnActive:   { backgroundColor: '#ECFDF5', borderColor: '#1B4332' },
  filterBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#1B4332', borderRadius: 8,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  // ── Collapsible secondary ──────────────────────────────────────────────────
  secondaryWrap: {
    overflow: 'hidden',          // clips children as maxHeight → 0
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  // Type toggle
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  typeTabActive:     { borderBottomColor: '#1B4332' },
  typeTabText:       { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  typeTabTextActive: { color: '#1B4332', fontWeight: '600' },

  // ── Feed ───────────────────────────────────────────────────────────────────
  list:        { paddingTop: 4, paddingBottom: 80 },
  cardWrapper: { paddingHorizontal: 12, paddingTop: 8 },
  loader:      { marginTop: 60 },
  empty: {
    alignItems: 'center', marginTop: 60, gap: 8, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  emptyHint:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  loadMore: {
    paddingVertical: 14, marginHorizontal: 12, marginVertical: 8,
    backgroundColor: '#FFFFFF', borderRadius: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: '#1B4332' },
});
