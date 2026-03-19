import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { LangOption, normalizeValue, prettifyValue } from '../lib/options';

interface SuggestInputProps {
  field: string;                 // API field name: 'product' | 'region' | etc.
  value: string;                 // currently selected normalized value
  onChange: (value: string) => void;
  seedOptions: LangOption[];     // seed labels for known values
  placeholder?: string;
}

export default function SuggestInput({ field, value, onChange, seedOptions, placeholder }: SuggestInputProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'am' | 'om';

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<{ value: string; count: number; label?: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Build a label lookup from seed options
  const labelMap = useRef(
    Object.fromEntries(seedOptions.map((o) => [o.value, o]))
  ).current;

  const getLabel = useCallback((val: string, apiLabel?: string) => {
    // Prefer seed option label (localized) → API-provided label → prettified key
    return labelMap[val]?.[lang] || apiLabel || prettifyValue(val);
  }, [lang, labelMap]);

  // Fetch suggestions on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.getSuggestions(field, query || undefined);
        setSuggestions(data);
      } catch {
        // Fall back to seed options filtered by query
        const q = query.toLowerCase();
        setSuggestions(
          seedOptions
            .filter((o) => !q || o.value.includes(q) || o.en.toLowerCase().includes(q))
            .map((o) => ({ value: o.value, count: 0 }))
        );
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, field]);

  const handleSelect = (val: string) => {
    onChange(val);
    setQuery('');
    setFocused(false);
  };

  const handleCustom = () => {
    if (!query.trim()) return;
    const normalized = normalizeValue(query);
    if (normalized) {
      handleSelect(normalized);
    }
  };

  // Filter suggestions by query
  const filtered = suggestions.filter((s) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const label = getLabel(s.value, s.label).toLowerCase();
    return s.value.includes(q) || label.includes(q);
  });

  const queryNormalized = normalizeValue(query);
  const exactMatch = filtered.some((s) => s.value === queryNormalized);

  return (
    <View style={styles.container}>
      {/* Selected value chip */}
      {value && !focused ? (
        <TouchableOpacity style={styles.selectedChip} onPress={() => { setFocused(true); setQuery(''); }}>
          <Text style={styles.selectedText}>{getLabel(value)}</Text>
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ) : (
        <TextInput
          style={styles.input}
          placeholder={placeholder || `Search or type ${field}...`}
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay to allow chip press to register
            setTimeout(() => setFocused(false), 200);
          }}
          onSubmitEditing={handleCustom}
          returnKeyType="done"
          autoCapitalize="none"
        />
      )}

      {/* Suggestions dropdown */}
      {focused && (
        <View style={styles.dropdown}>
          <FlatList
            data={filtered.slice(0, 15)}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, item.value === value && styles.optionActive]}
                onPress={() => handleSelect(item.value)}
              >
                <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>
                  {getLabel(item.value, item.label)}
                </Text>
                {item.count > 0 && (
                  <Text style={styles.countBadge}>{item.count}</Text>
                )}
              </TouchableOpacity>
            )}
            ListFooterComponent={
              query.trim() && !exactMatch ? (
                <TouchableOpacity style={styles.addOption} onPress={handleCustom}>
                  <Text style={styles.addText}>+ Add "{query.trim()}"</Text>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              query.trim() ? (
                <TouchableOpacity style={styles.addOption} onPress={handleCustom}>
                  <Text style={styles.addText}>+ Add "{query.trim()}"</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', zIndex: 10 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1a1a1a', backgroundColor: '#FAFAFA',
  },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5E9', borderColor: '#2E7D32',
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  selectedText: { fontSize: 15, color: '#2E7D32', fontWeight: '600', flex: 1 },
  clearBtn: { fontSize: 14, color: '#999', fontWeight: '700' },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    marginTop: 4, maxHeight: 220,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  list: { maxHeight: 220 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  optionActive: { backgroundColor: '#E8F5E9' },
  optionText: { fontSize: 14, color: '#333' },
  optionTextActive: { color: '#2E7D32', fontWeight: '600' },
  countBadge: {
    fontSize: 11, color: '#888', backgroundColor: '#F0F0F0',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  addOption: {
    paddingHorizontal: 14, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: '#E0E0E0',
  },
  addText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
});
