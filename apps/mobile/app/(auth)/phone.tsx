import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import LanguageToggle from '../../components/LanguageToggle';

type Step = 'phone' | 'name' | 'code';

export default function AuthScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const [step, setStep]   = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName]   = useState('');
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
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

  // ── Step 1: Enter phone ──────────────────────────────────────────────────
  const handlePhoneSubmit = async () => {
    if (phone.length < 9) { setError(t('auth.invalidPhone')); return; }
    setError('');
    setLoading(true);
    try {
      const result = await api.sendCode('0' + phone);
      setTelegramLink(result.telegramLink);
      if (result.isNewUser) {
        setIsNewUser(true);
        setStep('name');
      } else {
        setIsNewUser(false);
        setStep('code');
        setCountdown(60);
        // Auto-open Telegram
        if (result.telegramLink) {
          Linking.openURL(result.telegramLink).catch(() => {});
        }
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
      const result = await api.sendCode('0' + phone, name.trim());
      setTelegramLink(result.telegramLink);
      setStep('code');
      setCountdown(60);
      if (result.telegramLink) {
        Linking.openURL(result.telegramLink).catch(() => {});
      }
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
      const result = await api.verifyCode('0' + phone, code, isNewUser ? name.trim() : undefined);
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

    if (digit && index < 5) {
      otpRefs[index + 1].current?.focus();
    }

    const code = next.join('');
    if (code.length === 6) {
      handleVerifyCode(code);
    }
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
      const result = await api.sendCode('0' + phone, isNewUser ? name.trim() : undefined);
      setTelegramLink(result.telegramLink);
      setCountdown(60);
      if (result.telegramLink) {
        Linking.openURL(result.telegramLink).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTelegram = () => {
    if (telegramLink) Linking.openURL(telegramLink).catch(() => {});
  };

  const stepTitle = step === 'phone'
    ? t('auth.subtitle')
    : step === 'name'
    ? 'What is your name?'
    : `Code sent via Telegram`;

  const stepSubtitle = step === 'code' ? `+251 ${phone}` : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.langToggle}>
          <LanguageToggle />
        </View>

        <View style={styles.content}>
          <Text style={styles.logo}>{t('common.appName')}</Text>

          {/* Progress dots — only show after phone step */}
          {step !== 'phone' && (
            <View style={styles.progress}>
              {(isNewUser ? ['name', 'code'] as const : ['code'] as const).map((s) => (
                <View key={s} style={[
                  styles.dot,
                  step === s && styles.dotActive,
                  (s === 'name' && step === 'code') ? styles.dotDone : null,
                ]} />
              ))}
            </View>
          )}

          <Text style={step === 'phone' ? styles.subtitle : styles.title}>{stepTitle}</Text>
          {stepSubtitle ? <Text style={styles.stepSubtitle}>{stepSubtitle}</Text> : null}

          {/* ── Phone step ── */}
          {step === 'phone' && (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.enterPhone')}</Text>
                <View style={[styles.phoneRow, error ? styles.inputError : null]}>
                  <View style={styles.prefix}>
                    <Text style={styles.prefixText}>+251</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder={t('auth.phoneHint')}
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={9}
                    value={phone}
                    onChangeText={(v) => { setPhone(v); setError(''); }}
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

              <TouchableOpacity style={styles.backLink} onPress={() => { setStep('phone'); setError(''); }}>
                <Ionicons name="arrow-back" size={16} color="#2E7D32" />
                <Text style={styles.backText}>Change phone number</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Code step ── */}
          {step === 'code' && (
            <View style={styles.form}>
              {/* Open Telegram button */}
              {telegramLink && (
                <TouchableOpacity style={styles.telegramBtn} onPress={handleOpenTelegram}>
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

              <TouchableOpacity style={styles.backLink} onPress={() => { setStep('phone'); setError(''); setOtpDigits(['','','','','','']); }}>
                <Ionicons name="arrow-back" size={16} color="#2E7D32" />
                <Text style={styles.backText}>Change phone number</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1 },
  langToggle: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 48,
  },
  logo: {
    fontSize: 36, fontWeight: '800', color: '#2E7D32',
    textAlign: 'center', marginBottom: 8,
  },
  progress: {
    flexDirection: 'row', gap: 8, justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  dotActive: { backgroundColor: '#2E7D32', width: 24 },
  dotDone:   { backgroundColor: '#A5D6A7' },
  dotHidden: { display: 'none' },
  subtitle: {
    fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 28,
  },
  title: {
    fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 8,
    fontWeight: '600',
  },
  stepSubtitle: {
    fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24,
    fontWeight: '600',
  },
  form: { marginTop: 12 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    fontSize: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', color: '#1a1a1a',
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  prefix: {
    backgroundColor: '#F5F5F5', paddingHorizontal: 16, paddingVertical: 14,
    borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
    borderWidth: 1, borderColor: '#E0E0E0', borderRightWidth: 0,
  },
  prefixText: { fontSize: 16, color: '#333', fontWeight: '600' },
  phoneInput: {
    flex: 1, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
    borderWidth: 1, borderColor: '#E0E0E0', color: '#1a1a1a',
  },
  inputError: { borderColor: '#D32F2F', borderRadius: 12 },
  errorText: { fontSize: 12, color: '#D32F2F', marginTop: 6 },
  errorTextCenter: { fontSize: 13, color: '#D32F2F', marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#2E7D32', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', minHeight: 52, justifyContent: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Telegram button
  telegramBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#0088cc', paddingVertical: 14, borderRadius: 12,
    marginBottom: 24,
  },
  telegramBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // OTP
  codeLabel: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 16 },
  otpRow:  { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 24 },
  otpBox: {
    width: 48, height: 58, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    textAlign: 'center', fontSize: 24, fontWeight: '700', color: '#1a1a1a',
    backgroundColor: '#FAFAFA',
  },
  otpBoxFilled:  { borderColor: '#2E7D32', backgroundColor: '#F1F8E9' },
  otpBoxError:   { borderColor: '#D32F2F', backgroundColor: '#FFF5F5' },
  verifyingRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  verifyingText: { fontSize: 14, color: '#2E7D32' },
  resendBtn:  { alignItems: 'center', marginTop: 4 },
  resendText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  resendDisabled: { color: '#aaa' },
  // Back link
  backLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 20,
  },
  backText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
});
