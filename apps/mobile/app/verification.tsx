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
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

const BUSINESS_TYPES = [
  { key: 'exporter', i18nKey: 'verification.typeExporter' },
  { key: 'cooperative', i18nKey: 'verification.typeCooperative' },
  { key: 'trader', i18nKey: 'verification.typeTrader' },
  { key: 'farmer', i18nKey: 'verification.typeFarmer' },
];

export default function VerificationScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: verification, isLoading } = useQuery({
    queryKey: ['myVerification'],
    queryFn: () => api.getMyVerification(),
  });

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => api.submitVerification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myVerification'] });
      Alert.alert(t('common.success'), t('verification.submitSuccess'));
    },
    onError: (error: any) => {
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const handleSubmit = () => {
    if (!businessName.trim()) {
      Alert.alert('', `${t('verification.businessName')} ${t('common.required')}`);
      return;
    }
    if (!businessType) {
      Alert.alert('', `${t('verification.businessType')} ${t('common.required')}`);
      return;
    }

    const payload: any = {
      businessName: businessName.trim(),
      businessType,
    };
    if (tradeLicense.trim()) {
      payload.tradeLicenseNumber = tradeLicense.trim();
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

  const status = verification?.status;
  const isSubmitted = status === 'pending' || status === 'verified';
  const isRejected = status === 'rejected';

  // Show status card if already submitted (pending or verified)
  if (isSubmitted) {
    const isPending = status === 'pending';
    const iconName = isPending ? 'time-outline' : 'checkmark-circle';
    const iconColor = isPending ? '#FF9800' : '#1B4332';
    const statusText = isPending
      ? t('verification.pending')
      : t('verification.verified');
    const statusColor = isPending ? '#FF9800' : '#1B4332';

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Ionicons name={iconName} size={56} color={iconColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
          {verification?.businessName && (
            <Text style={styles.statusDetail}>{verification.businessName}</Text>
          )}
          {verification?.businessType && (
            <Text style={styles.statusSubdetail}>{verification.businessType}</Text>
          )}
        </View>
      </ScrollView>
    );
  }

  // Show form for unverified or rejected users
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isRejected && (
        <View style={styles.rejectedBanner}>
          <Ionicons name="close-circle" size={24} color="#D32F2F" />
          <Text style={styles.rejectedText}>{t('verification.rejected')}</Text>
        </View>
      )}

      <Text style={styles.heading}>{t('verification.getVerified')}</Text>

      {/* Business Name */}
      <Text style={styles.sectionTitle}>{t('verification.businessName')} *</Text>
      <TextInput
        style={styles.textInput}
        placeholder={t('verification.businessName')}
        placeholderTextColor="#999"
        value={businessName}
        onChangeText={setBusinessName}
      />

      {/* Business Type */}
      <Text style={styles.sectionTitle}>{t('verification.businessType')} *</Text>
      <View style={styles.chipRow}>
        {BUSINESS_TYPES.map((bt) => {
          const selected = businessType === bt.key;
          return (
            <TouchableOpacity
              key={bt.key}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setBusinessType(bt.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {t(bt.i18nKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Trade License */}
      <Text style={styles.sectionTitle}>
        {t('verification.tradeLicense')} ({t('common.optional')})
      </Text>
      <TextInput
        style={styles.textInput}
        placeholder={t('verification.tradeLicenseHint')}
        placeholderTextColor="#999"
        value={tradeLicense}
        onChangeText={setTradeLicense}
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, mutation.isPending && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        <Text style={styles.submitText}>
          {mutation.isPending ? t('common.loading') : t('verification.submit')}
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
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  chipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#1B4332',
  },
  chipText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#1B4332',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#1B4332',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statusCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusDetail: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
  },
  statusSubdetail: {
    fontSize: 14,
    color: '#666',
  },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  rejectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
  },
});
