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

export default function DepositVerificationScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch current status
  const { data: verification, isLoading } = useQuery({
    queryKey: ['myDepositVerification'],
    queryFn: () => api.getMyDepositVerification(),
  });

  // Fetch supported banks
  const { data: banksData } = useQuery({
    queryKey: ['depositBanks'],
    queryFn: () => api.getDepositBanks(),
  });

  // Form state — initiate
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  // Form state — confirm
  const [amount1, setAmount1] = useState('');
  const [amount2, setAmount2] = useState('');

  const initiateMutation = useMutation({
    mutationFn: (data: { accountHolder: string; accountNumber: string; bankName: string }) =>
      api.initiateDepositVerification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDepositVerification'] });
      Alert.alert(t('common.success'), t('depositVerification.depositsSent'));
    },
    onError: (error: any) => {
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (data: { amount1: number; amount2: number }) =>
      api.confirmDepositVerification(data.amount1, data.amount2),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDepositVerification'] });
      Alert.alert(t('common.success'), t('depositVerification.verifiedDetail'));
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['myDepositVerification'] });
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const handleInitiate = () => {
    if (!accountHolder.trim()) {
      Alert.alert('', `${t('depositVerification.accountHolder')} ${t('common.required')}`);
      return;
    }
    if (!accountNumber.trim()) {
      Alert.alert('', `${t('depositVerification.accountNumber')} ${t('common.required')}`);
      return;
    }
    if (!selectedBank) {
      Alert.alert('', `${t('depositVerification.bankName')} ${t('common.required')}`);
      return;
    }
    initiateMutation.mutate({
      accountHolder: accountHolder.trim(),
      accountNumber: accountNumber.trim(),
      bankName: selectedBank,
    });
  };

  const handleConfirm = () => {
    const a1 = parseFloat(amount1);
    const a2 = parseFloat(amount2);
    if (isNaN(a1) || a1 <= 0 || a1 >= 1) {
      Alert.alert('', `${t('depositVerification.amount1')} — ${t('depositVerification.amountHint')}`);
      return;
    }
    if (isNaN(a2) || a2 <= 0 || a2 >= 1) {
      Alert.alert('', `${t('depositVerification.amount2')} — ${t('depositVerification.amountHint')}`);
      return;
    }
    confirmMutation.mutate({ amount1: a1, amount2: a2 });
  };

  const handleStartNew = () => {
    setAccountHolder('');
    setAccountNumber('');
    setSelectedBank('');
    setAmount1('');
    setAmount2('');
    // Re-initiate will be handled by showing the form
    queryClient.setQueryData(['myDepositVerification'], { status: 'none' });
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  const status = verification?.status;

  // ─── VERIFIED STATE ───
  if (status === 'verified') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={64} color="#2E7D32" />
          <Text style={[styles.statusTitle, { color: '#1B4332' }]}>
            {t('depositVerification.verified')}
          </Text>
          <Text style={styles.statusSubtext}>
            {t('depositVerification.verifiedDetail')}
          </Text>
          {verification?.bankName && (
            <View style={styles.accountInfo}>
              <Text style={styles.accountInfoText}>{verification.bankName}</Text>
              <Text style={styles.accountInfoText}>
                ****{verification.accountNumber?.slice(-4)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // ─── PENDING STATE — show confirm form ───
  if (status === 'pending') {
    const hoursLeft = Math.max(
      0,
      Math.round((new Date(verification.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))
    );

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Ionicons name="wallet-outline" size={48} color="#FF9800" />
          <Text style={[styles.statusTitle, { color: '#FF9800' }]}>
            {t('depositVerification.depositsSent')}
          </Text>
          <Text style={styles.statusSubtext}>
            {t('depositVerification.pendingDetail')}
          </Text>
        </View>

        {verification.bankName && (
          <View style={styles.accountBadge}>
            <Text style={styles.accountBadgeText}>
              {verification.bankName} — ****{verification.accountNumber?.slice(-4)}
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {t('depositVerification.expiresIn')} {hoursLeft} {t('depositVerification.hours')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="refresh-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {verification.attemptsLeft} {t('depositVerification.attemptsLeft')}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('depositVerification.amount1')}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={t('depositVerification.amountHint')}
          placeholderTextColor="#999"
          value={amount1}
          onChangeText={setAmount1}
          keyboardType="decimal-pad"
        />

        <Text style={styles.sectionTitle}>{t('depositVerification.amount2')}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={t('depositVerification.amountHint')}
          placeholderTextColor="#999"
          value={amount2}
          onChangeText={setAmount2}
          keyboardType="decimal-pad"
        />

        <TouchableOpacity
          style={[styles.submitBtn, confirmMutation.isPending && styles.submitDisabled]}
          onPress={handleConfirm}
          disabled={confirmMutation.isPending}
        >
          <Text style={styles.submitText}>
            {confirmMutation.isPending ? t('common.loading') : t('depositVerification.confirm')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── EXPIRED / FAILED — show retry option ───
  if (status === 'expired' || status === 'failed') {
    const isExpired = status === 'expired';
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Ionicons
            name={isExpired ? 'time-outline' : 'close-circle'}
            size={56}
            color="#D32F2F"
          />
          <Text style={[styles.statusTitle, { color: '#D32F2F' }]}>
            {isExpired ? t('depositVerification.expired') : t('depositVerification.failed')}
          </Text>
          <Text style={styles.statusSubtext}>
            {isExpired ? t('depositVerification.expiredDetail') : t('depositVerification.failedDetail')}
          </Text>
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={handleStartNew}>
          <Text style={styles.submitText}>{t('depositVerification.startNew')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── DEFAULT: INITIATE FORM ───
  const banks = banksData?.banks || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{t('depositVerification.title')}</Text>
      <Text style={styles.subtitle}>{t('depositVerification.subtitle')}</Text>

      {/* Account Holder */}
      <Text style={styles.sectionTitle}>{t('depositVerification.accountHolder')} *</Text>
      <TextInput
        style={styles.textInput}
        placeholder={t('depositVerification.accountHolderHint')}
        placeholderTextColor="#999"
        value={accountHolder}
        onChangeText={setAccountHolder}
      />

      {/* Account Number */}
      <Text style={styles.sectionTitle}>{t('depositVerification.accountNumber')} *</Text>
      <TextInput
        style={styles.textInput}
        placeholder={t('depositVerification.accountNumberHint')}
        placeholderTextColor="#999"
        value={accountNumber}
        onChangeText={setAccountNumber}
        keyboardType="number-pad"
      />

      {/* Bank Selector */}
      <Text style={styles.sectionTitle}>{t('depositVerification.bankName')} *</Text>
      <View style={styles.chipRow}>
        {banks.map((bank: string) => {
          const selected = selectedBank === bank;
          return (
            <TouchableOpacity
              key={bank}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setSelectedBank(bank)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {bank}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, initiateMutation.isPending && styles.submitDisabled]}
        onPress={handleInitiate}
        disabled={initiateMutation.isPending}
      >
        <Text style={styles.submitText}>
          {initiateMutation.isPending ? t('common.loading') : t('depositVerification.initiate')}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
    paddingVertical: 40,
    gap: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  accountInfo: {
    marginTop: 12,
    alignItems: 'center',
    gap: 4,
  },
  accountInfoText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  accountBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  accountBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
  },
});
