import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import {
  PRODUCT_OPTIONS, REGION_OPTIONS, GRADE_OPTIONS,
  TRANSACTION_OPTIONS, CURRENCY_OPTIONS,
  getProductProfile,
} from '../../lib/options';
import ResponsiveContainer from '../../components/ResponsiveContainer';
import SuggestInput from '../../components/SuggestInput';
import ImagePickerSection from '../../components/ImagePickerSection';

interface ChipSelectProps {
  options: { value: string; en: string; am: string; om: string }[];
  value: string;
  onChange: (value: string) => void;
  lang: 'en' | 'am' | 'om';
}

function ChipSelect({ options, value, onChange, lang }: ChipSelectProps) {
  return (
    <View style={styles.chips}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, value === opt.value && styles.chipActive]}
          onPress={() => onChange(value === opt.value ? '' : opt.value)}
        >
          <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>
            {opt[lang]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const EMPTY_FORM = {
  type: 'sell',
  productCategory: '',
  description: '',
  region: '',
  grade: '',
  condition: '',
  transactionType: '',
  quantity: '',
  unit: '',
  price: '',
  currency: 'ETB',
  images: [] as string[],
};

export default function CreateScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'am' | 'om';
  const queryClient = useQueryClient();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [posted, setPosted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const update = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  // Derive profile from selected product
  const profile = getProductProfile(form.productCategory);
  const hasProduct = !!form.productCategory;

  // When product changes: reset dependent fields, set smart defaults
  const handleProductChange = (v: string) => {
    const p = getProductProfile(v);
    setForm(f => ({
      ...f,
      productCategory: v,
      grade: '',
      condition: '',
      unit: p.defaultUnit,
    }));
    setErrors(e => ({ ...e, productCategory: '' }));
  };

  const mutation = useMutation({
    mutationFn: (data: any) => api.createListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setPosted(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setForm({ ...EMPTY_FORM });
      setTimeout(() => { setPosted(false); router.push('/(tabs)'); }, 2000);
    },
    onError: (error: any) => {
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.productCategory) e.productCategory = t('common.required');
    if (!form.region)          e.region          = t('common.required');
    if (!form.quantity || isNaN(parseFloat(form.quantity)) || parseFloat(form.quantity) <= 0)
                               e.quantity        = t('common.required');
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0)
                               e.price           = t('common.required');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload: any = { type: form.type, productCategory: form.productCategory };
    if (form.description)     payload.description     = form.description.trim();
    if (form.region)          payload.region          = form.region;
    if (form.grade)           payload.grade           = parseInt(form.grade);
    if (form.condition)       payload.process         = form.condition;
    if (form.transactionType) payload.transactionType = form.transactionType;
    if (form.quantity)        payload.quantity        = parseFloat(form.quantity);
    if (form.unit)            payload.unit            = form.unit;
    if (form.price)           payload.price           = parseFloat(form.price);
    payload.currency = form.currency;
    payload.images   = form.images;
    mutation.mutate(payload);
  };

  return (
    <ResponsiveContainer size="form">
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>

      {/* Success banner */}
      {posted && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={22} color="#1B4332" />
          <Text style={styles.successText}>{t('listing.postSuccess')}</Text>
        </View>
      )}

      {/* Buy / Sell */}
      <Text style={styles.sectionTitle}>{t('listing.type')}</Text>
      <View style={styles.typeRow}>
        {(['sell', 'buy'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeBtn, form.type === type && (type === 'buy' ? styles.typeBuyActive : styles.typeSellActive)]}
            onPress={() => update('type', type)}
          >
            <Text style={[styles.typeText, form.type === type && styles.typeTextActive]}>
              {type === 'buy' ? t('common.buy') : t('common.sell')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Product — always shown */}
      <Text style={styles.sectionTitle}>{t('listing.product')} <Text style={styles.required}>*</Text></Text>
      <SuggestInput
        field="product"
        value={form.productCategory}
        onChange={handleProductChange}
        seedOptions={PRODUCT_OPTIONS}
        placeholder={t('listing.productHint')}
      />
      {!!errors.productCategory && <Text style={styles.errorText}>{errors.productCategory}</Text>}

      {/* Prompt when no product selected */}
      {!hasProduct && (
        <View style={styles.promptBox}>
          <Ionicons name="information-circle-outline" size={18} color="#1B4332" />
          <Text style={styles.promptText}>Select a product to see relevant fields</Text>
        </View>
      )}

      {/* All other fields — only shown after product selected */}
      {hasProduct && (
        <>
          {/* Photos */}
          <Text style={styles.sectionTitle}>{t('listing.photos') || 'Photos'}</Text>
          <ImagePickerSection images={form.images} onChange={imgs => update('images', imgs)} />

          {/* Region */}
          <Text style={styles.sectionTitle}>{t('listing.region')} <Text style={styles.required}>*</Text></Text>
          <SuggestInput
            field="region"
            value={form.region}
            onChange={v => { update('region', v); setErrors(e => ({ ...e, region: '' })); }}
            seedOptions={REGION_OPTIONS}
            placeholder={t('listing.regionHint')}
          />
          {!!errors.region && <Text style={styles.errorText}>{errors.region}</Text>}

          {/* Grade — product-specific */}
          {profile.showGrade && (
            <>
              <Text style={styles.sectionTitle}>{t('listing.grade')}</Text>
              <ChipSelect options={GRADE_OPTIONS} value={form.grade} onChange={v => update('grade', v)} lang={lang} />
            </>
          )}

          {/* Condition/Process — product-specific options */}
          {profile.conditions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{profile.conditionLabel}</Text>
              <ChipSelect options={profile.conditions} value={form.condition} onChange={v => update('condition', v)} lang={lang} />
            </>
          )}

          {/* Transaction type */}
          {profile.showTransaction && (
            <>
              <Text style={styles.sectionTitle}>{t('listing.transactionType')}</Text>
              <ChipSelect options={TRANSACTION_OPTIONS} value={form.transactionType} onChange={v => update('transactionType', v)} lang={lang} />
            </>
          )}

          {/* Quantity + Unit */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.sectionTitle}>{t('listing.quantity')} <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.textInput, !!errors.quantity && styles.inputError]}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={form.quantity}
                onChangeText={v => { update('quantity', v); setErrors(e => ({ ...e, quantity: '' })); }}
              />
              {!!errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
            </View>
            <View style={styles.half}>
              <Text style={styles.sectionTitle}>{t('listing.unit')}</Text>
              <ChipSelect options={profile.units} value={form.unit} onChange={v => update('unit', v)} lang={lang} />
            </View>
          </View>

          {/* Price + Currency */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.sectionTitle}>{t('listing.price')} <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.textInput, !!errors.price && styles.inputError]}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={form.price}
                onChangeText={v => { update('price', v); setErrors(e => ({ ...e, price: '' })); }}
              />
              {!!errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>
            <View style={styles.half}>
              <Text style={styles.sectionTitle}>{t('listing.currency')}</Text>
              <ChipSelect options={CURRENCY_OPTIONS} value={form.currency} onChange={v => update('currency', v)} lang={lang} />
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>{t('listing.description')}</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder={t('listing.descriptionHint')}
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            value={form.description}
            onChangeText={v => update('description', v)}
            maxLength={2000}
          />

          <TouchableOpacity
            style={[styles.submitBtn, (mutation.isPending || posted) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={mutation.isPending || posted}
          >
            <Text style={styles.submitText}>
              {mutation.isPending ? t('common.loading') : t('common.post')}
            </Text>
          </TouchableOpacity>
        </>
      )}

    </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content:   { padding: 20, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#F9FAFB', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  typeBuyActive:  { backgroundColor: '#EFF6FF', borderColor: '#1E40AF' },
  typeSellActive: { backgroundColor: '#ECFDF5', borderColor: '#1B4332' },
  typeText:       { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  typeTextActive: { color: '#1A1D21' },
  promptBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 8,
    padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  promptText: { fontSize: 14, color: '#1B4332' },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive:     { backgroundColor: '#ECFDF5', borderColor: '#1B4332' },
  chipText:       { fontSize: 13, color: '#6B7280' },
  chipTextActive: { color: '#1B4332', fontWeight: '600' },
  textInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1A1D21', backgroundColor: '#F9FAFB',
  },
  textArea:   { minHeight: 80, textAlignVertical: 'top' },
  row:        { flexDirection: 'row', gap: 12 },
  half:       { flex: 1 },
  required:   { color: '#DC2626', fontSize: 14 },
  errorText:  { color: '#DC2626', fontSize: 12, marginTop: 4, marginLeft: 2 },
  inputError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ECFDF5', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14, marginTop: 24,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  successText: { fontSize: 15, fontWeight: '600', color: '#065F46', flex: 1 },
  submitBtn: {
    backgroundColor: '#1B4332', paddingVertical: 16,
    borderRadius: 8, alignItems: 'center', marginTop: 12,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
