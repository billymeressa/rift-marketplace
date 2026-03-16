import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  PRODUCT_OPTIONS,
  REGION_OPTIONS,
  CONDITION_OPTIONS,
  GRADE_OPTIONS,
} from '../lib/options';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
}

const FILTER_OPTIONS = {
  type: [
    { value: 'buy',  en: 'Buy',  am: 'ግዢ' },
    { value: 'sell', en: 'Sell', am: 'ሽያጭ' },
  ],
  productCategory: PRODUCT_OPTIONS,
  region:    REGION_OPTIONS,
  grade:     GRADE_OPTIONS,
  condition: CONDITION_OPTIONS,
};

const FILTER_LABELS: Record<string, { en: string; am: string }> = {
  type:            { en: 'Type',      am: 'ዓይነት' },
  productCategory: { en: 'Product',   am: 'ምርት' },
  region:          { en: 'Region',    am: 'ክልል' },
  grade:           { en: 'Grade',     am: 'ደረጃ' },
  condition:       { en: 'Condition', am: 'ሁኔታ' },
};

export default function FilterSheet({ visible, onClose, filters, onApply }: FilterSheetProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'am';
  const [localFilters, setLocalFilters] = useState(filters);

  const toggleFilter = (key: string, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? '' : value,
    }));
  };

  const clearAll = () => setLocalFilters({});

  const apply = () => {
    const cleaned = Object.fromEntries(
      Object.entries(localFilters).filter(([, v]) => v)
    );
    onApply(cleaned);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('search.filters')}</Text>
            <TouchableOpacity onPress={clearAll}>
              <Text style={styles.clearText}>{t('search.clearAll')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {(Object.entries(FILTER_OPTIONS) as [string, typeof PRODUCT_OPTIONS][]).map(([key, options]) => (
              <View key={key} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {FILTER_LABELS[key]?.[lang] || key}
                </Text>
                <View style={styles.chips}>
                  {options.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.chip,
                        localFilters[key] === opt.value && styles.chipActive,
                      ]}
                      onPress={() => toggleFilter(key, opt.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          localFilters[key] === opt.value && styles.chipTextActive,
                        ]}
                      >
                        {opt[lang]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={apply}>
              <Text style={styles.applyText}>{t('search.applyFilters')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sheetTitle:   { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  clearText:    { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  content:      { padding: 20 },
  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 10 },
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F5F5F5',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  chipActive:     { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  chipText:       { fontSize: 14, color: '#666' },
  chipTextActive: { color: '#2E7D32', fontWeight: '600' },
  footer: {
    flexDirection: 'row', padding: 20, gap: 12,
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#F5F5F5', alignItems: 'center',
  },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  applyBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#2E7D32', alignItems: 'center',
  },
  applyText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
