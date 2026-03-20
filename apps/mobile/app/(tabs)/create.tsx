import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import {
  PRODUCT_OPTIONS,
  REGION_OPTIONS,
  CONDITION_OPTIONS,
  GRADE_OPTIONS,
  TRANSACTION_OPTIONS,
  UNIT_OPTIONS,
  CURRENCY_OPTIONS,
  GRADED_PRODUCTS,
  NO_CONDITION_PRODUCTS,
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

export default function CreateScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'am' | 'om';
  const queryClient = useQueryClient();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [posted, setPosted] = useState(false);

  const [form, setForm] = useState({
    type: 'sell',
    productCategory: 'coffee',
    description: '',
    region: '',
    grade: '',
    condition: '',
    transactionType: '',
    quantity: '',
    unit: 'kg',
    price: '',
    currency: 'ETB',
    images: [] as string[],
  });

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const showGrade     = GRADED_PRODUCTS.has(form.productCategory);
  const showCondition = !NO_CONDITION_PRODUCTS.has(form.productCategory);

  const mutation = useMutation({
    mutationFn: (data: any) => api.createListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setPosted(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setForm({
        type: 'sell', productCategory: 'coffee', description: '',
        region: '', grade: '', condition: '', transactionType: '',
        quantity: '', unit: 'kg', price: '', currency: 'ETB', images: [],
      });
      setTimeout(() => {
        setPosted(false);
        router.push('/(tabs)');
      }, 2000);
    },
    onError: (error: any) => {
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const generateTitle = () => {
    const product = PRODUCT_OPTIONS.find((o) => o.value === form.productCategory)?.en
      || form.productCategory;
    const parts: string[] = [];
    if (form.grade) parts.push(`G${form.grade}`);
    if (form.condition) {
      const condLabel = CONDITION_OPTIONS.find((o) => o.value === form.condition)?.en;
      if (condLabel) parts.push(condLabel);
    }
    parts.push(product);
    if (form.region) {
      const regionLabel = REGION_OPTIONS.find((o) => o.value === form.region)?.en || form.region;
      parts.push(`– ${regionLabel}`);
    }
    const prefix = form.type === 'buy' ? 'Buying ' : '';
    return `${prefix}${parts.join(' ')}`.trim();
  };

  const handleSubmit = () => {
    const payload: any = {
      type: form.type,
      productCategory: form.productCategory,
      title: generateTitle(),
    };
    if (form.description)    payload.description    = form.description.trim();
    if (form.region)         payload.region         = form.region;
    if (form.grade)          payload.grade          = parseInt(form.grade);
    if (form.condition)      payload.process        = form.condition;
    if (form.transactionType)payload.transactionType = form.transactionType;
    if (form.quantity)       payload.quantity       = parseFloat(form.quantity);
    if (form.unit)           payload.unit           = form.unit;
    if (form.price)          payload.price          = parseFloat(form.price);
    payload.currency = form.currency;
    if (form.images.length > 0) payload.images = form.images;

    mutation.mutate(payload);
  };

  return (
    <ResponsiveContainer>
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>

      {/* Success banner */}
      {posted && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
          <Text style={styles.successText}>{t('listing.postSuccess')}</Text>
        </View>
      )}

      {/* Buy / Sell */}
      <Text style={styles.sectionTitle}>{t('listing.type')}</Text>
      <View style={styles.typeRow}>
        {['buy', 'sell'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeBtn,
              form.type === type && (type === 'buy' ? styles.typeBuyActive : styles.typeSellActive),
            ]}
            onPress={() => update('type', type)}
          >
            <Text style={[styles.typeText, form.type === type && styles.typeTextActive]}>
              {type === 'buy' ? t('common.buy') : t('common.sell')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Product */}
      <Text style={styles.sectionTitle}>{t('listing.product')}</Text>
      <SuggestInput
        field="product"
        value={form.productCategory}
        onChange={(v) => update('productCategory', v)}
        seedOptions={PRODUCT_OPTIONS}
        placeholder={t('listing.productHint')}
      />

      {/* Photos */}
      <Text style={styles.sectionTitle}>{t('listing.photos') || 'Photos'}</Text>
      <ImagePickerSection
        images={form.images}
        onChange={(imgs) => update('images', imgs)}
      />

      {/* Region — shown for all products */}
      <Text style={styles.sectionTitle}>{t('listing.region')}</Text>
      <SuggestInput
        field="region"
        value={form.region}
        onChange={(v) => update('region', v)}
        seedOptions={REGION_OPTIONS}
        placeholder={t('listing.regionHint')}
      />

      {/* Grade — shown for graded commodities */}
      {showGrade && (
        <>
          <Text style={styles.sectionTitle}>{t('listing.grade')}</Text>
          <ChipSelect
            options={GRADE_OPTIONS}
            value={form.grade}
            onChange={(v) => update('grade', v)}
            lang={lang}
          />
        </>
      )}

      {/* Condition — shown for non-equipment/livestock */}
      {showCondition && (
        <>
          <Text style={styles.sectionTitle}>{t('listing.condition')}</Text>
          <ChipSelect
            options={CONDITION_OPTIONS}
            value={form.condition}
            onChange={(v) => update('condition', v)}
            lang={lang}
          />
        </>
      )}

      {/* Transaction Type */}
      <Text style={styles.sectionTitle}>{t('listing.transactionType')}</Text>
      <ChipSelect
        options={TRANSACTION_OPTIONS}
        value={form.transactionType}
        onChange={(v) => update('transactionType', v)}
        lang={lang}
      />

      {/* Quantity + Unit */}
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.sectionTitle}>{t('listing.quantity')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="0"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={form.quantity}
            onChangeText={(v) => update('quantity', v)}
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.sectionTitle}>{t('listing.unit')}</Text>
          <ChipSelect
            options={UNIT_OPTIONS}
            value={form.unit}
            onChange={(v) => update('unit', v)}
            lang={lang}
          />
        </View>
      </View>

      {/* Price + Currency */}
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.sectionTitle}>{t('listing.price')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="0"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={form.price}
            onChangeText={(v) => update('price', v)}
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.sectionTitle}>{t('listing.currency')}</Text>
          <ChipSelect
            options={CURRENCY_OPTIONS}
            value={form.currency}
            onChange={(v) => update('currency', v)}
            lang={lang}
          />
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
        onChangeText={(v) => update('description', v)}
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
    </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content:   { padding: 20, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 14, fontWeight: '600', color: '#555',
    marginBottom: 8, marginTop: 16,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F5F5F5', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  typeBuyActive:  { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  typeSellActive: { backgroundColor: '#FFF3E0', borderColor: '#E65100' },
  typeText:       { fontSize: 15, fontWeight: '600', color: '#666' },
  typeTextActive: { color: '#1a1a1a' },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F5F5F5',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  chipActive:     { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  chipText:       { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#2E7D32', fontWeight: '600' },
  textInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1a1a1a', backgroundColor: '#FAFAFA',
  },
  textArea:   { minHeight: 80, textAlignVertical: 'top' },
  row:        { flexDirection: 'row', gap: 12 },
  half:       { flex: 1 },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#E8F5E9', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, marginTop: 24,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  successText: { fontSize: 15, fontWeight: '600', color: '#2E7D32', flex: 1 },
  submitBtn:  {
    backgroundColor: '#2E7D32', paddingVertical: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 12,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
