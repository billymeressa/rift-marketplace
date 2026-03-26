import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  PRODUCT_OPTIONS,
  REGION_OPTIONS,
  CONDITION_OPTIONS,
  GRADE_OPTIONS,
  TRANSACTION_OPTIONS,
  CATEGORY_GROUPS,
  LangOption,
} from '../lib/options';
import SuggestInput from './SuggestInput';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
}

const FILTER_LABELS: Record<string, { en: string; am: string; om: string }> = {
  type:            { en: 'Listing Type',         am: 'ዓይነት',             om: 'Gosa' },
  category:        { en: 'Product Category',     am: 'የምርት ምድብ',         om: 'Gosa Oomishaa' },
  productCategory: { en: 'Specific Product',     am: 'ምርት',              om: 'Oomisha' },
  region:          { en: 'Growing Region',       am: 'ክልል',              om: 'Naannoo' },
  grade:           { en: 'Quality Grade',        am: 'ደረጃ',              om: 'Sadarkaa' },
  condition:       { en: 'Processing Method',    am: 'ሁኔታ',              om: 'Haala' },
  transactionType: { en: 'Transaction Type',     am: 'የግብይት ዓይነት',      om: 'Gosa Daldala' },
  minQuantity:     { en: 'Min. Quantity',        am: 'ዝቅተኛ መጠን',        om: 'Hamma Xiqqaa' },
  maxPrice:        { en: 'Max Price',            am: 'ከፍተኛ ዋጋ',         om: 'Gatii Ol\'aanaa' },
};

const TYPE_OPTIONS: LangOption[] = [
  { value: 'sell', en: 'Suppliers (For Sale)', am: 'አቅራቢዎች (ለሽያጭ)', om: 'Dhiyeessitootaa (Gurguramaa)' },
  { value: 'buy', en: 'Buyers (Wanted)', am: 'ገዢዎች (ፈልጓል)', om: 'Bittootaa (Barbaadamaa)' },
];

export default function FilterSheet({ visible, onClose, filters, onApply }: FilterSheetProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'am' | 'om';
  const [localFilters, setLocalFilters] = useState(filters);

  const toggleFilter = (key: string, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? '' : value,
    }));
  };

  const updateFilter = (key: string, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAll = () => setLocalFilters({});

  const apply = () => {
    const cleaned = Object.fromEntries(
      Object.entries(localFilters).filter(([, v]) => v)
    );
    onApply(cleaned);
    onClose();
  };

  const activeCount = Object.values(localFilters).filter(Boolean).length;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>
                {lang === 'am' ? 'ማጣሪያዎች' : lang === 'om' ? 'Filannoo' : 'Advanced Filters'}
              </Text>
              {activeCount > 0 && (
                <Text style={styles.activeLabel}>
                  {activeCount} {lang === 'am' ? 'ንቁ' : lang === 'om' ? 'hojii irra' : 'active'}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
              <Ionicons name="refresh-outline" size={14} color="#DC2626" />
              <Text style={styles.clearText}>{t('search.clearAll')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Type */}
            <FilterSection label={FILTER_LABELS.type[lang]}>
              <View style={styles.chips}>
                {TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, localFilters.type === opt.value && styles.chipActive]}
                    onPress={() => toggleFilter('type', opt.value)}
                  >
                    <Text style={[styles.chipText, localFilters.type === opt.value && styles.chipTextActive]}>
                      {opt[lang]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FilterSection>

            {/* Product Category group */}
            <FilterSection label={FILTER_LABELS.category[lang]}>
              <View style={styles.chips}>
                {CATEGORY_GROUPS.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.chip, localFilters.category === cat.key && styles.chipActive]}
                    onPress={() => toggleFilter('category', cat.key)}
                  >
                    <Ionicons name={cat.icon as any} size={13} color={localFilters.category === cat.key ? '#1B4332' : '#6B7280'} />
                    <Text style={[styles.chipText, localFilters.category === cat.key && styles.chipTextActive]}>
                      {cat[lang]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FilterSection>

            {/* Specific product search */}
            <FilterSection label={FILTER_LABELS.productCategory[lang]}>
              <SuggestInput
                field="product"
                value={localFilters.productCategory || ''}
                onChange={(v) => updateFilter('productCategory', v)}
                seedOptions={PRODUCT_OPTIONS}
              />
            </FilterSection>

            {/* Region */}
            <FilterSection label={FILTER_LABELS.region[lang]}>
              <SuggestInput
                field="region"
                value={localFilters.region || ''}
                onChange={(v) => updateFilter('region', v)}
                seedOptions={REGION_OPTIONS}
              />
            </FilterSection>

            {/* Grade */}
            <FilterSection label={FILTER_LABELS.grade[lang]}>
              <View style={styles.chips}>
                {GRADE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, localFilters.grade === opt.value && styles.chipActive]}
                    onPress={() => toggleFilter('grade', opt.value)}
                  >
                    <Text style={[styles.chipText, localFilters.grade === opt.value && styles.chipTextActive]}>
                      {opt[lang]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FilterSection>

            {/* Processing method */}
            <FilterSection label={FILTER_LABELS.condition[lang]}>
              <View style={styles.chips}>
                {CONDITION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, localFilters.condition === opt.value && styles.chipActive]}
                    onPress={() => toggleFilter('condition', opt.value)}
                  >
                    <Text style={[styles.chipText, localFilters.condition === opt.value && styles.chipTextActive]}>
                      {opt[lang]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FilterSection>

            {/* Transaction type */}
            <FilterSection label={FILTER_LABELS.transactionType[lang]}>
              <View style={styles.chips}>
                {TRANSACTION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, localFilters.transactionType === opt.value && styles.chipActive]}
                    onPress={() => toggleFilter('transactionType', opt.value)}
                  >
                    <Text style={[styles.chipText, localFilters.transactionType === opt.value && styles.chipTextActive]}>
                      {opt[lang]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FilterSection>

            {/* Min Quantity */}
            <FilterSection label={FILTER_LABELS.minQuantity[lang]}>
              <TextInput
                style={styles.textInput}
                placeholder={lang === 'am' ? 'ለምሳሌ 100' : 'e.g. 100'}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={localFilters.minQuantity || ''}
                onChangeText={(v) => updateFilter('minQuantity', v)}
              />
            </FilterSection>

            {/* Max Price */}
            <FilterSection label={FILTER_LABELS.maxPrice[lang]}>
              <TextInput
                style={styles.textInput}
                placeholder={lang === 'am' ? 'ለምሳሌ 50000' : 'e.g. 50000'}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={localFilters.maxPrice || ''}
                onChangeText={(v) => updateFilter('maxPrice', v)}
              />
            </FilterSection>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={apply}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.applyText}>
                {lang === 'am' ? 'ማጣሪያ ተግብር' : lang === 'om' ? 'Filannoo Fayyadami' : 'Apply Filters'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1A1D21' },
  activeLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  clearText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  content: { padding: 20 },
  section: { marginBottom: 20, zIndex: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#ECFDF5', borderColor: '#1B4332' },
  chipText: { fontSize: 13, color: '#6B7280' },
  chipTextActive: { color: '#1B4332', fontWeight: '600' },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1D21',
    backgroundColor: '#F9FAFB',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  applyBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1B4332',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  applyText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
