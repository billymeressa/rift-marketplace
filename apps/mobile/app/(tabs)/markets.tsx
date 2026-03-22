import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { api, CommodityPrice } from '../../lib/api';
import { useResponsive } from '../../hooks/useResponsive';

// ─── Commodity icon map ───────────────────────────────────────────────────────

const COMMODITY_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  coffee_ice:     { icon: 'cafe-outline',        color: '#5D4037' },
  coffee_ecta:    { icon: 'cafe-outline',        color: '#795548' },
  sesame_qingdao: { icon: 'leaf-outline',        color: '#558B2F' },
  soybeans_cif:   { icon: 'ellipse-outline',     color: '#F9A825' },
  gum_arabic_cfr: { icon: 'water-outline',       color: '#0288D1' },
  kidney_beans:   { icon: 'nutrition-outline',   color: '#C62828' },
};

const DEFAULT_ICON = { icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap, color: '#2E7D32' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(price: string | null, prev: string | null): number | null {
  if (!price || !prev) return null;
  const p = parseFloat(price);
  const pp = parseFloat(prev);
  if (!pp) return null;
  return ((p - pp) / pp) * 100;
}

function formatPrice(price: string | null, currency: string): string {
  if (!price) return 'N/A';
  const n = parseFloat(price);
  if (currency === 'RMB') return `¥${n.toLocaleString()}`;
  if (currency === 'USD') return `$${n.toFixed(2)}`;
  if (currency === 'ETB') return `ETB ${n.toLocaleString()}`;
  return `${currency} ${n.toLocaleString()}`;
}

// ─── Price Card ───────────────────────────────────────────────────────────────

function PriceCard({ item }: { item: CommodityPrice }) {
  const change = pct(item.price, item.prevPrice);
  const isUp = change !== null && change > 0;
  const isDown = change !== null && change < 0;
  const { icon, color } = COMMODITY_ICONS[item.commodity] ?? DEFAULT_ICON;

  const updatedAgo = (() => {
    try {
      const d = new Date(item.updatedAt);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return `${Math.floor(diffHrs / 24)}d ago`;
    } catch { return ''; }
  })();

  return (
    <View style={styles.card}>
      {/* Left — icon */}
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>

      {/* Middle — name + meta */}
      <View style={styles.cardBody}>
        <Text style={styles.label}>{item.label}</Text>
        <View style={styles.metaRow}>
          {item.tradeTerm ? <Chip text={item.tradeTerm} /> : null}
          {item.market ? <Text style={styles.market}>{item.market}</Text> : null}
        </View>
        <Text style={styles.source}>{item.source ?? ''}{updatedAgo ? ` · ${updatedAgo}` : ''}</Text>
      </View>

      {/* Right — price + change */}
      <View style={styles.priceCol}>
        <Text style={styles.price}>{formatPrice(item.price, item.currency)}</Text>
        <Text style={styles.unit}>{item.unit}</Text>
        {change !== null ? (
          <View style={[styles.changeBadge, isUp ? styles.changeUp : styles.changeDown]}>
            <Ionicons
              name={isUp ? 'arrow-up' : 'arrow-down'}
              size={10}
              color={isUp ? '#2E7D32' : '#C62828'}
            />
            <Text style={[styles.changeText, isUp ? styles.changeTextUp : styles.changeTextDown]}>
              {Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const SECTIONS: { key: string; label: string; commodities: string[] }[] = [
  { key: 'coffee',  label: '☕ Coffee',          commodities: ['coffee_ice', 'coffee_ecta'] },
  { key: 'oilseed', label: '🌿 Oilseeds & Grains', commodities: ['sesame_qingdao', 'soybeans_cif'] },
  { key: 'other',   label: '🌍 Other Commodities', commodities: ['gum_arabic_cfr', 'kidney_beans'] },
];

export default function MarketsScreen() {
  const { isMobile } = useResponsive();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['prices'],
    queryFn: () => api.getPrices(),
    refetchInterval: 5 * 60 * 1000, // refresh every 5 minutes
    staleTime: 2 * 60 * 1000,
  });

  const prices = data?.data ?? [];
  const byKey = Object.fromEntries(prices.map((p) => [p.commodity, p]));

  const lastUpdated = prices.length
    ? (() => {
        try {
          const d = new Date(prices[0].updatedAt);
          const diffMs = Date.now() - d.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 1) return 'just now';
          if (diffMins < 60) return `${diffMins}m ago`;
          const diffHrs = Math.floor(diffMins / 60);
          if (diffHrs < 24) return `${diffHrs}h ago`;
          return `${Math.floor(diffHrs / 24)}d ago`;
        } catch { return ''; }
      })()
    : '';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        !isMobile && styles.contentWide,
      ]}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#2E7D32" />
      }
    >
      {/* Header banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>Market Prices</Text>
          <Text style={styles.bannerSub}>Ethiopian Export Commodities</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn} disabled={isFetching}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {lastUpdated ? (
        <Text style={styles.lastUpdated}>Data updated {lastUpdated}</Text>
      ) : null}

      {/* Loading */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading prices…</Text>
        </View>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={40} color="#999" />
          <Text style={styles.errorText}>Could not load prices</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sections */}
      {!isLoading && !isError && SECTIONS.map((section) => {
        const items = section.commodities.map((c) => byKey[c]).filter(Boolean);
        if (!items.length) return null;
        return (
          <View key={section.key}>
            <SectionHeader title={section.label} />
            {items.map((item) => <PriceCard key={item.commodity} item={item} />)}
          </View>
        );
      })}

      {/* Disclaimer */}
      {!isLoading && prices.length > 0 && (
        <Text style={styles.disclaimer}>
          Prices are indicative only. Updated manually from market reports and trader channels.
          Always verify with your buyer/seller before transacting.
        </Text>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  contentWide: { maxWidth: 720, alignSelf: 'center', width: '100%' },

  banner: {
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  bannerSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  refreshBtn:  { padding: 6 },

  lastUpdated: { color: '#999', fontSize: 12, marginBottom: 16, textAlign: 'right' },

  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } as any,
    }),
  },
  iconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardBody: { flex: 1, marginRight: 8 },
  label:    { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 },
  market:   { fontSize: 12, color: '#666' },
  source:   { fontSize: 11, color: '#aaa' },

  chip:     { backgroundColor: '#E8F5E9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  chipText: { fontSize: 11, color: '#2E7D32', fontWeight: '600' },

  priceCol: { alignItems: 'flex-end' },
  price:    { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  unit:     { fontSize: 11, color: '#888', marginTop: 1, marginBottom: 4 },

  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  changeUp:      { backgroundColor: '#E8F5E9' },
  changeDown:    { backgroundColor: '#FFEBEE' },
  changeText:    { fontSize: 11, fontWeight: '600' },
  changeTextUp:  { color: '#2E7D32' },
  changeTextDown:{ color: '#C62828' },

  center:      { alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: '#666', marginTop: 12 },
  errorText:   { color: '#666', marginTop: 12, fontSize: 15 },
  retryBtn:    { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2E7D32', borderRadius: 8 },
  retryText:   { color: '#fff', fontWeight: '600' },

  disclaimer: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 20,
    paddingHorizontal: 8,
  },
});
