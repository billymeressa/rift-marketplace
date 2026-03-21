import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Linking, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import LanguageToggle from '../../components/LanguageToggle';
import { useResponsive } from '../../hooks/useResponsive';

// ─── Country data ────────────────────────────────────────────────────────────

interface Country {
  code: string;   // ISO 3166-1 alpha-2
  dial: string;   // e.g. "+251"
  flag: string;   // emoji
  name: string;
  maxLen: number; // max local digits (after dial code)
}

const COUNTRIES: Country[] = [
  { code: 'ET', dial: '+251', flag: '🇪🇹', name: 'Ethiopia',      maxLen: 9  },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya',         maxLen: 9  },
  { code: 'TZ', dial: '+255', flag: '🇹🇿', name: 'Tanzania',      maxLen: 9  },
  { code: 'UG', dial: '+256', flag: '🇺🇬', name: 'Uganda',        maxLen: 9  },
  { code: 'RW', dial: '+250', flag: '🇷🇼', name: 'Rwanda',        maxLen: 9  },
  { code: 'SO', dial: '+252', flag: '🇸🇴', name: 'Somalia',       maxLen: 8  },
  { code: 'SD', dial: '+249', flag: '🇸🇩', name: 'Sudan',         maxLen: 9  },
  { code: 'ER', dial: '+291', flag: '🇪🇷', name: 'Eritrea',       maxLen: 7  },
  { code: 'DJ', dial: '+253', flag: '🇩🇯', name: 'Djibouti',      maxLen: 8  },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria',       maxLen: 10 },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana',         maxLen: 9  },
  { code: 'ZA', dial: '+27',  flag: '🇿🇦', name: 'South Africa',  maxLen: 9  },
  { code: 'EG', dial: '+20',  flag: '🇪🇬', name: 'Egypt',         maxLen: 10 },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'United States', maxLen: 10 },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'United Kingdom',maxLen: 10 },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Germany',       maxLen: 11 },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE',           maxLen: 9  },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia',  maxLen: 9  },
  { code: 'CN', dial: '+86',  flag: '🇨🇳', name: 'China',         maxLen: 11 },
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India',         maxLen: 10 },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // Ethiopia

// ─── Country Picker Modal ─────────────────────────────────────────────────────

function CountryPicker({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: Country;
  onSelect: (c: Country) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.dial.includes(query)
      )
    : COUNTRIES;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={pickerStyles.container}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>Select Country</Text>
          <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={pickerStyles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Search country or code..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[pickerStyles.row, item.code === selected.code && pickerStyles.rowSelected]}
              onPress={() => { onSelect(item); onClose(); setQuery(''); }}
            >
              <Text style={pickerStyles.flag}>{item.flag}</Text>
              <Text style={pickerStyles.countryName}>{item.name}</Text>
              <Text style={pickerStyles.dial}>{item.dial}</Text>
              {item.code === selected.code && (
                <Ionicons name="checkmark" size={18} color="#2E7D32" />
              )}
            </TouchableOpacity>
          )}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  closeBtn: { padding: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginVertical: 12,
    backgroundColor: '#F5F5F5', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  rowSelected: { backgroundColor: '#F1F8E9' },
  flag: { fontSize: 22, width: 32 },
  countryName: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  dial: { fontSize: 15, color: '#666', fontWeight: '600', marginRight: 8 },
});

// ─── Main Auth Screen ─────────────────────────────────────────────────────────

type Step = 'phone' | 'name' | 'code';

export default function AuthScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const { isMobile, formMaxWidth } = useResponsive();

  const [step, setStep] = useState<Step>('phone');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showPicker, setShowPicker] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // OTP input
  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
                   useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Full E.164 phone number to send to the API
  const fullPhone = country.dial + phone;

  // ── Step 1: Enter phone ──────────────────────────────────────────────────
  const handlePhoneSubmit = async () => {
    if (phone.length < 6) { setError('Please enter a valid phone number'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await api.sendCode(fullPhone);
      setTelegramLink(result.telegramLink);
      if (result.isNewUser) {
        setIsNewUser(true);
        setStep('name');
      } else {
        setIsNewUser(false);
        setStep('code');
        setCountdown(60);
        if (result.telegramLink) Linking.openURL(result.telegramLink).catch(() => {});
      }
    } catch (err: any) {
      if (err.message === 'name_required') {
        setIsNewUser(true);
        setStep('name');
      } else if (err.message === 'too_many_attempts') {
        setError('Too many attempts. Please wait an hour.');
      } else {
        setError(err.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Enter name (new users only) ──────────────────────────────────
  const handleNameSubmit = async () => {
    if (!name.trim()) { setError(t('auth.nameRequired')); return; }
    setError('');
    setLoading(true);
    try {
      const result = await api.sendCode(fullPhone, name.trim());
      setTelegramLink(result.telegramLink);
      setStep('code');
      setCountdown(60);
      if (result.telegramLink) Linking.openURL(result.telegramLink).catch(() => {});
    } catch (err: any) {
      if (err.message === 'too_many_attempts') {
        setError('Too many attempts. Please wait an hour.');
      } else {
        setError(err.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Verify code ──────────────────────────────────────────────────
  const handleVerifyCode = async (code: string) => {
    if (code.length < 6) return;
    setError('');
    setLoading(true);
    try {
      const result = await api.verifyCode(fullPhone, code, isNewUser ? name.trim() : undefined);
      await signIn(result.token, result.user);
    } catch (err: any) {
      if (err.message === 'invalid_or_expired_code') {
        setError('Incorrect or expired code. Please try again.');
      } else {
        setError(err.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setError('');
    if (digit && index < 5) otpRefs[index + 1].current?.focus();
    const code = next.join('');
    if (code.length === 6) handleVerifyCode(code);
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleResend = async () => {
    setOtpDigits(['', '', '', '', '', '']);
    setError('');
    setLoading(true);
    try {
      const result = await api.sendCode(fullPhone, isNewUser ? name.trim() : undefined);
      setTelegramLink(result.telegramLink);
      setCountdown(60);
      if (result.telegramLink) Linking.openURL(result.telegramLink).catch(() => {});
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setError('');
    setOtpDigits(['', '', '', '', '', '']);
  };

  const stepTitle = step === 'phone'
    ? t('auth.subtitle')
    : step === 'name'
    ? 'What is your name?'
    : 'Code sent via Telegram';

  const stepSubtitle = step === 'code' ? `${country.flag} ${country.dial} ${phone}` : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.scroll, !isMobile && styles.scrollDesktop]} keyboardShouldPersistTaps="handled">
        <View style={styles.langToggle}>
          <LanguageToggle />
        </View>

        <View style={[
          styles.content,
          !isMobile && {
            maxWidth: formMaxWidth,
            alignSelf: 'center' as const,
            width: '100%' as any,
            backgroundColor: '#fff',
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
            paddingVertical: 48,
            marginVertical: 40,
          },
        ]}>
          <Text style={styles.logo}>{t('common.appName')}</Text>

          {/* Progress dots — only after phone step */}
          {step !== 'phone' && (
            <View style={styles.progress}>
              {(isNewUser ? ['name', 'code'] as const : ['code'] as const).map((s) => (
                <View key={s} style={[
                  styles.dot,
                  step === s && styles.dotActive,
                  s === 'name' && step === 'code' ? styles.dotDone : null,
                ]} />
              ))}
            </View>
          )}

          <Text style={step === 'phone' ? styles.subtitle : styles.title}>{stepTitle}</Text>
          {stepSubtitle ? <Text style={styles.stepSubtitle}>{stepSubtitle}</Text> : null}

          {/* ── Phone step ── */}
          {step === 'phone' && (
            <View style={styles.form}>
              <View style={styles.telegramBadge}>
                <Ionicons name="paper-plane" size={18} color="#0088cc" />
                <Text style={styles.telegramBadgeText}>
                  You'll receive your code on <Text style={styles.telegramBadgeBold}>Telegram</Text>
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.enterPhone')}</Text>
                <View style={[styles.phoneRow, error ? styles.inputError : null]}>
                  {/* Country picker trigger */}
                  <TouchableOpacity
                    style={styles.countryBtn}
                    onPress={() => setShowPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={styles.countryDial}>{country.dial}</Text>
                    <Ionicons name="chevron-down" size={14} color="#666" />
                  </TouchableOpacity>
                  <View style={styles.divider} />
                  <TextInput
                    style={styles.phoneInput}
                    placeholder={t('auth.phoneHint')}
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={country.maxLen}
                    value={phone}
                    onChangeText={(v) => { setPhone(v.replace(/\D/g, '')); setError(''); }}
                    onSubmitEditing={handlePhoneSubmit}
                    returnKeyType="go"
                    autoFocus
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handlePhoneSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.buttonText}>{t('auth.continue')}</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── Name step (new users) ── */}
          {step === 'name' && (
            <View style={styles.form}>
              <View style={styles.telegramBadge}>
                <Ionicons name="paper-plane" size={18} color="#0088cc" />
                <Text style={styles.telegramBadgeText}>
                  You'll receive your code on <Text style={styles.telegramBadgeBold}>Telegram</Text>
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.fullName')}</Text>
                <TextInput
                  style={[styles.input, error ? styles.inputError : null]}
                  placeholder={t('auth.fullNameHint')}
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={(v) => { setName(v); setError(''); }}
                  onSubmitEditing={handleNameSubmit}
                  returnKeyType="go"
                  autoCapitalize="words"
                  autoFocus
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleNameSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.buttonText}>{t('auth.continue')}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.backLink} onPress={handleBack}>
                <Ionicons name="arrow-back" size={16} color="#2E7D32" />
                <Text style={styles.backText}>Change phone number</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Code step ── */}
          {step === 'code' && (
            <View style={styles.form}>
              {telegramLink && (
                <TouchableOpacity style={styles.telegramBtn} onPress={() => Linking.openURL(telegramLink!).catch(() => {})}>
                  <Ionicons name="paper-plane" size={20} color="#fff" />
                  <Text style={styles.telegramBtnText}>Open Telegram to get code</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.codeLabel}>Enter the 6-digit code</Text>

              <View style={styles.otpRow}>
                {otpDigits.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={otpRefs[i]}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null, error ? styles.otpBoxError : null]}
                    value={digit}
                    onChangeText={t => handleOtpChange(t, i)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={i === 0}
                  />
                ))}
              </View>

              {loading && (
                <View style={styles.verifyingRow}>
                  <ActivityIndicator size="small" color="#2E7D32" />
                  <Text style={styles.verifyingText}>Verifying...</Text>
                </View>
              )}

              {error ? <Text style={styles.errorTextCenter}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                disabled={countdown > 0 || loading}
              >
                <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backLink} onPress={handleBack}>
                <Ionicons name="arrow-back" size={16} color="#2E7D32" />
                <Text style={styles.backText}>Change phone number</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <CountryPicker
        visible={showPicker}
        selected={country}
        onSelect={(c) => { setCountry(c); setPhone(''); }}
        onClose={() => setShowPicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1 },
  scrollDesktop: { backgroundColor: '#F5F5F5', justifyContent: 'center' },
  langToggle: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  content: {
    flex: 1, justifyContent: 'center',
    paddingHorizontal: 24, paddingTop: 120, paddingBottom: 48,
  },
  logo: {
    fontSize: 36, fontWeight: '800', color: '#2E7D32',
    textAlign: 'center', marginBottom: 8,
  },
  progress: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  dotActive: { backgroundColor: '#2E7D32', width: 24 },
  dotDone: { backgroundColor: '#A5D6A7' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 28 },
  title: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 8, fontWeight: '600' },
  stepSubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24, fontWeight: '600' },
  form: { marginTop: 16 },
  telegramBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#E8F4FB', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, marginBottom: 20,
  },
  telegramBadgeText: { fontSize: 13, color: '#333' },
  telegramBadgeBold: { fontWeight: '700', color: '#0088cc' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    fontSize: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', color: '#1a1a1a',
  },
  // Phone row with country picker
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    backgroundColor: '#fff', overflow: 'hidden',
  },
  countryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: '#F8F8F8',
  },
  countryFlag: { fontSize: 20 },
  countryDial: { fontSize: 15, fontWeight: '600', color: '#333' },
  divider: { width: 1, height: 28, backgroundColor: '#E0E0E0' },
  phoneInput: {
    flex: 1, fontSize: 16, paddingHorizontal: 14, paddingVertical: 14, color: '#1a1a1a',
  },
  inputError: { borderColor: '#D32F2F' },
  errorText: { fontSize: 12, color: '#D32F2F', marginTop: 6 },
  errorTextCenter: { fontSize: 13, color: '#D32F2F', marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#2E7D32', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', minHeight: 52, justifyContent: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  telegramBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#0088cc', paddingVertical: 14, borderRadius: 12, marginBottom: 24,
  },
  telegramBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  codeLabel: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 16 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 24 },
  otpBox: {
    width: 48, height: 58, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    textAlign: 'center', fontSize: 24, fontWeight: '700', color: '#1a1a1a',
    backgroundColor: '#FAFAFA',
  },
  otpBoxFilled: { borderColor: '#2E7D32', backgroundColor: '#F1F8E9' },
  otpBoxError:  { borderColor: '#D32F2F', backgroundColor: '#FFF5F5' },
  verifyingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  verifyingText: { fontSize: 14, color: '#2E7D32' },
  resendBtn: { alignItems: 'center', marginTop: 4 },
  resendText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  resendDisabled: { color: '#aaa' },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  backText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
});
