import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export default function CreateOrderScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => api.getListing(listingId!),
    enabled: !!listingId,
  });

  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [prefilled, setPrefilled] = useState(false);

  // Pre-fill from listing once loaded
  if (listing && !prefilled) {
    if (listing.unit) setUnit(listing.unit);
    if (listing.price) setPricePerUnit(String(listing.price));
    setPrefilled(true);
  }

  const mutation = useMutation({
    mutationFn: (data: any) => api.createOrder(data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace(`/order/${result.id}`);
    },
    onError: (error: any) => {
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const parsedQuantity = parseFloat(quantity);
  const parsedPrice = parseFloat(pricePerUnit);
  const totalPrice =
    !isNaN(parsedQuantity) && !isNaN(parsedPrice)
      ? parsedQuantity * parsedPrice
      : 0;

  const handleSubmit = () => {
    if (!quantity || isNaN(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('', `${t('order.quantity')} ${t('common.required')}`);
      return;
    }
    if (!pricePerUnit || isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('', `${t('order.pricePerUnit')} ${t('common.required')}`);
      return;
    }

    const payload: any = {
      listingId,
      quantity: parsedQuantity,
      unit: unit || undefined,
      pricePerUnit: parsedPrice,
      currency: listing?.currency || 'ETB',
    };
    if (deliveryTerms.trim()) {
      payload.deliveryTerms = deliveryTerms.trim();
    }

    mutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
      </View>
    );
  }

  const currencySymbol = listing.currency === 'USD' ? '$' : '';
  const currencySuffix = listing.currency === 'ETB' ? ' ETB' : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Listing context */}
      <View style={styles.listingContext}>
        <Text style={styles.listingTitle}>{listing.title}</Text>
        <View style={styles.listingMeta}>
          {listing.productCategory && (
            <Text style={styles.productBadge}>{listing.productCategory}</Text>
          )}
          {listing.user?.name && (
            <Text style={styles.sellerName}>{listing.user.name}</Text>
          )}
        </View>
      </View>

      {/* Quantity */}
      <Text style={styles.sectionTitle}>{t('order.quantity')} *</Text>
      <TextInput
        style={styles.textInput}
        placeholder="0"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />

      {/* Unit */}
      <Text style={styles.sectionTitle}>{t('order.unit')}</Text>
      <TextInput
        style={styles.textInput}
        placeholder={t('order.unitHint')}
        placeholderTextColor="#999"
        value={unit}
        onChangeText={setUnit}
      />

      {/* Price per unit */}
      <Text style={styles.sectionTitle}>{t('order.pricePerUnit')} *</Text>
      <TextInput
        style={styles.textInput}
        placeholder="0"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={pricePerUnit}
        onChangeText={setPricePerUnit}
      />

      {/* Delivery terms */}
      <Text style={styles.sectionTitle}>{t('order.deliveryTerms')}</Text>
      <TextInput
        style={[styles.textInput, styles.textArea]}
        placeholder={t('order.deliveryTermsHint')}
        placeholderTextColor="#999"
        multiline
        numberOfLines={3}
        value={deliveryTerms}
        onChangeText={setDeliveryTerms}
        maxLength={1000}
      />

      {/* Total price */}
      {totalPrice > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('order.totalPrice')}</Text>
          <Text style={styles.totalValue}>
            {currencySymbol}
            {totalPrice.toLocaleString()}
            {currencySuffix}
          </Text>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, mutation.isPending && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        <Text style={styles.submitText}>
          {mutation.isPending ? t('common.loading') : t('order.submitOrder')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  listingContext: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sellerName: {
    fontSize: 13,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },
  submitBtn: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
