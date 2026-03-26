import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import ResponsiveContainer from '../../../components/ResponsiveContainer';
import {
  PRODUCT_OPTIONS, REGION_OPTIONS, CONDITION_OPTIONS, GRADE_OPTIONS,
  TRANSACTION_OPTIONS, UNIT_OPTIONS, CURRENCY_OPTIONS,
  GRADED_PRODUCTS, NO_CONDITION_PRODUCTS,
} from '../../../lib/options';
import SuggestInput from '../../../components/SuggestInput';
import ImagePickerSection from '../../../components/ImagePickerSection';

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

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'am' | 'om';
  const queryClient = useQueryClient();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    type: 'sell',
    productCategory: '',
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

  // Load existing listing
  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.getListing(id!),
    enabled: !!id,
  });

  // Pre-populate form once listing loads
  useEffect(() => {
    if (!listing || ready) return;
    setForm({
      type: listing.type || 'sell',
      productCategory: listing.productCategory || '',
      description: listing.description || '',
      region: listing.region || '',
      grade: listing.grade ? String(listing.grade) : '',
      condition: listing.process || '',
      transactionType: listing.transactionType || '',
      quantity: listing.quantity ? String(listing.quantity) : '',
      unit: listing.unit || 'kg',
      price: listing.price ? String(listing.price) : '',
      currency: listing.currency || 'ETB',
      images: listing.images || [],
    });
    setReady(true);
  }, [listing]);

  const showGrade     = GRADED_PRODUCTS.has(form.productCategory);
  const showCondition = !NO_CONDITION_PRODUCTS.has(form.productCategory);

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

  const mutation = useMutation({
    mutationFn: (data: any) => api.updateListing(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const handleDelete = () => {
    const doDelete = async () => {
      await api.deleteListing(id!);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      router.replace('/(tabs)');
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('listing.deleteConfirm') || 'Delete this listing?')) doDelete();
      return;
    }
    Alert.alert(t('common.delete'), t('listing.deleteConfirm') || 'Delete this listing?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: doDelete },
    ]);
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload: any = {
      type: form.type,
      productCategory: form.productCategory,
    };
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

  if (isLoading || !ready) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  return (
    <ResponsiveContainer size="form">
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>

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
      <Text style={styles.sectionTitle}>{t('listing.product')} <Text style={styles.required}>*</Text></Text>
      <SuggestInput
        field="product"
        value={form.productCategory}
        onChange={(v) => { update('productCategory', v); setErrors(e => ({ ...e, productCategory: '' })); }}
        seedOptions={PRODUCT_OPTIONS}
        placeholder={t('listing.productHint')}
      />
      {!!errors.productCategory && <Text style={styles.errorText}>{errors.productCategory}</Text>}

      {/* Photos */}
      <Text style={styles.sectionTitle}>{t('listing.photos') || 'Photos'}</Text>
      <ImagePickerSection
        images={form.images}
        onChange={(imgs) => update('images', imgs)}
      />

      {/* Region */}
      <Text style={styles.sectionTitle}>{t('listing.region')} <Text style={styles.required}>*</Text></Text>
      <SuggestInput
        field="region"
        value={form.region}
        onChange={(v) => { update('region', v); setErrors(e => ({ ...e, region: '' })); }}
        seedOptions={REGION_OPTIONS}
        placeholder={t('listing.regionHint')}
      />
      {!!errors.region && <Text style={styles.errorText}>{errors.region}</Text>}

      {/* Grade */}
      {showGrade && (
        <>
          <Text style={styles.sectionTitle}>{t('listing.grade')}</Text>
          <ChipSelect options={GRADE_OPTIONS} value={form.grade} onChange={(v) => update('grade', v)} lang={lang} />
        </>
      )}

      {/* Condition */}
      {showCondition && (
        <>
          <Text style={styles.sectionTitle}>{t('listing.condition')}</Text>
          <ChipSelect options={CONDITION_OPTIONS} value={form.condition} onChange={(v) => update('condition', v)} lang={lang} />
        </>
      )}

      {/* Transaction Type */}
      <Text style={styles.sectionTitle}>{t('listing.transactionType')}</Text>
      <ChipSelect options={TRANSACTION_OPTIONS} value={form.transactionType} onChange={(v) => update('transactionType', v)} lang={lang} />

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
            onChangeText={(v) => { update('quantity', v); setErrors(e => ({ ...e, quantity: '' })); }}
          />
          {!!errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
        </View>
        <View style={styles.half}>
          <Text style={styles.sectionTitle}>{t('listing.unit')}</Text>
          <ChipSelect options={UNIT_OPTIONS} value={form.unit} onChange={(v) => update('unit', v)} lang={lang} />
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
            onChangeText={(v) => { update('price', v); setErrors(e => ({ ...e, price: '' })); }}
          />
          {!!errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        </View>
        <View style={styles.half}>
          <Text style={styles.sectionTitle}>{t('listing.currency')}</Text>
          <ChipSelect options={CURRENCY_OPTIONS} value={form.currency} onChange={(v) => update('currency', v)} lang={lang} />
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

      {/* Save */}
      <TouchableOpacity
        style={[styles.submitBtn, mutation.isPending && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        <Text style={styles.submitText}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Text>
      </TouchableOpacity>

      {/* Delete */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={18} color="#DC2626" />
        <Text style={styles.deleteText}>{t('common.delete')} {t('listing.listing') || 'Listing'}</Text>
      </TouchableOpacity>

    </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  loader:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#fff' },
  content:   { padding: 20, paddingBottom: 60 },
  sectionTitle: {
    fontSize: 14, fontWeight: '600', color: '#555',
    marginBottom: 8, marginTop: 16,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  typeBuyActive:  { backgroundColor: '#ECFDF5', borderColor: '#1B4332' },
  typeSellActive: { backgroundColor: '#EFF6FF', borderColor: '#1E40AF' },
  typeText:       { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  typeTextActive: { color: '#1A1D21' },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F3F4F6',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive:     { backgroundColor: '#ECFDF5', borderColor: '#1B4332' },
  chipText:       { fontSize: 13, color: '#6B7280' },
  chipTextActive: { color: '#1B4332', fontWeight: '600' },
  textInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1A1D21', backgroundColor: '#FAFAFA',
  },
  textArea:   { minHeight: 80, textAlignVertical: 'top' },
  row:        { flexDirection: 'row', gap: 12 },
  half:       { flex: 1 },
  required:   { color: '#DC2626', fontSize: 14 },
  errorText:  { color: '#DC2626', fontSize: 12, marginTop: 4, marginLeft: 2 },
  inputError: { borderColor: '#DC2626', backgroundColor: '#FFF5F5' },
  submitBtn: {
    backgroundColor: '#1B4332', paddingVertical: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 24,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginTop: 12,
  },
  deleteText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
});
