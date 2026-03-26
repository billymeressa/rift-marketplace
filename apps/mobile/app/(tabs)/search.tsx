import { useState, useCallback } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import ListingCard from '../../components/ListingCard';
import FilterSheet from '../../components/FilterSheet';
import ResponsiveContainer from '../../components/ResponsiveContainer';
import { useResponsive } from '../../hooks/useResponsive';

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [typeTab, setTypeTab] = useState<'all' | 'sell' | 'buy'>('all');
  const { numColumns, isMobile } = useResponsive();

  const typeParam = typeTab !== 'all' ? { type: typeTab } : {};

  const queryParams = {
    ...filters,
    ...typeParam,
    ...(submittedSearch ? { search: submittedSearch } : {}),
    limit: '20',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['listings', 'search', queryParams],
    queryFn: () => api.getListings(queryParams),
  });

  const listings = data?.data || [];
  const total = data?.total || 0;

  const activeFilterCount = Object.keys(filters).length;

  return (
    <ResponsiveContainer style={styles.container} size="feed">
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => setSubmittedSearch(search)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setSubmittedSearch(''); }}>
              <Ionicons name="close-circle" size={18} color="#999" />
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

      {/* Type toggle */}
      <View style={styles.typeToggleRow}>
        {(['all', 'sell', 'buy'] as const).map((tab) => {
          const label =
            tab === 'all'  ? (i18n.language === 'am' ? 'ሁሉም' : i18n.language === 'om' ? 'Hunda' : 'All') :
            tab === 'sell' ? (i18n.language === 'am' ? 'ለሽያጭ' : i18n.language === 'om' ? 'Gurguramaa' : 'For Sale') :
                             (i18n.language === 'am' ? 'ፈልጓል' : i18n.language === 'om' ? 'Barbaada' : 'Wanted');
          const isActive = typeTab === tab;
          const color = tab === 'sell' ? '#1B4332' : tab === 'buy' ? '#1E40AF' : '#555';
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.typeTab, isActive && { borderBottomColor: color, borderBottomWidth: 2.5 }]}
              onPress={() => setTypeTab(tab)}
            >
              <Text style={[styles.typeTabText, isActive && { color, fontWeight: '700' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {(submittedSearch || activeFilterCount > 0) && (
        <Text style={styles.resultCount}>{total} {t('search.results')}</Text>
      )}

      <FlatList
        style={styles.flatList}
        key={`search-cols-${numColumns}`}
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <View style={numColumns > 1 ? { flex: 1 / numColumns, maxWidth: `${100 / numColumns}%` as any, marginBottom: 2 } : { marginBottom: 2 }}>
            <ListingCard listing={item} />
          </View>
        )}
        contentContainerStyle={[styles.list, !isMobile && { paddingHorizontal: 10 }]}
        columnWrapperStyle={numColumns > 1 ? { gap: 0 } : undefined}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#1B4332" style={styles.loader} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>{t('common.noResults')}</Text>
            </View>
          )
        }
      />

      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
      />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 10 } : {}),
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    color: '#1A1D21',
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#1B4332',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    color: '#9CA3AF',
  },
  resultCount: {
    fontSize: 13,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  flatList: {
    flex: 1,
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
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
