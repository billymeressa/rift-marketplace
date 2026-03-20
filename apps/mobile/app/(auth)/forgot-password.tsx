import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';

type Step = 'phone' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep]           = useState<Step>('phone');
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [countdown, setCountdown] = useState(0);

  // OTP input refs for auto-advance
  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
                   useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const fullPhone = '+251' + (phone.startsWith('0') ? phone.slice(1) : phone);

  // ── Step 1: Send OTP ─────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    if (phone.length < 9) { setError(t('auth.invalidPhone')); return; }
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword('0' + phone);
      setStep('otp');
      setCountdown(60);
    } catch (err: any) {
      if (err.message === 'too_many_attempts') {
        setError('Too many attempts. Please wait an hour before trying again.');
      } else {
        setError(err.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────
  const handleVerifyOTP = async (code: string) => {
    if (code.length < 6) { setError('Enter the 6-digit code'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await api.verifyOTP('0' + phone, code);
      setResetToken(result.resetToken);
      setStep('password');
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

  // Handle OTP digit input with auto-advance
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
    setOtp(code);
    if (code.length === 6) {
      handleVerifyOTP(code);
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // ── Step 3: Reset password ───────────────────────────────────────────────
  const handleReset = async () => {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await api.resetPassword(resetToken, password);
      await signIn(result.token, result.user);
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    phone:    'Forgot Password',
    otp:      'Enter Code',
    password: 'New Password',
  };

  const stepSubtitles: Record<Step, string> = {
    phone:    'Enter your registered phone number',
    otp:      `Code sent to +251 ${phone}`,
    password: 'Choose a strong password',
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>

        {/* Progress dots */}
        <View style={styles.progress}>
          {(['phone', 'otp', 'password'] as Step[]).map((s, i) => (
            <View key={s} style={[styles.dot, step === s && styles.dotActive,
              (['otp', 'password'].includes(step) && s === 'phone') ||
              (step === 'password' && s === 'otp') ? styles.dotDone : null]} />
          ))}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{stepTitles[step]}</Text>
          <Text style={styles.subtitle}>{stepSubtitles[step]}</Text>

          {/* ── Step 1: Phone ── */}
          {step === 'phone' && (
            <>
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
                    onChangeText={v => { setPhone(v); setError(''); }}
                    onSubmitEditing={handleSendOTP}
                    returnKeyType="go"
                    autoFocus
                  />
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.buttonText}>Send Code</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <>
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
                  <Text style={styles.verifyingText}>Verifying…</Text>
                </View>
              )}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => { setOtpDigits(['','','','','','']); setOtp(''); setError(''); handleSendOTP(); }}
                disabled={countdown > 0 || loading}
              >
                <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 3: New password ── */}
          {step === 'password' && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>New Password</Text>
                <View style={[styles.pwRow, error && !confirm ? styles.inputError : null]}>
                  <TextInput
                    style={styles.pwInput}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPw}
                    value={password}
                    onChangeText={v => { setPassword(v); setError(''); }}
                    returnKeyType="next"
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[styles.pwRow, error && confirm ? styles.inputError : null]}>
                  <TextInput
                    style={styles.pwInput}
                    placeholder="Repeat password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPw}
                    value={confirm}
                    onChangeText={v => { setConfirm(v); setError(''); }}
                    onSubmitEditing={handleReset}
                    returnKeyType="go"
                  />
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.buttonText}>Reset Password</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll:    { flexGrow: 1 },
  backBtn:   { marginTop: 60, marginLeft: 20, padding: 8, alignSelf: 'flex-start' },
  progress:  { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  dotActive: { backgroundColor: '#2E7D32', width: 24 },
  dotDone:   { backgroundColor: '#A5D6A7' },
  content:   { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 48 },
  title:     { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  subtitle:  { fontSize: 14, color: '#888', marginBottom: 36 },
  field:     { marginBottom: 18 },
  label:     { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  phoneRow:  { flexDirection: 'row', alignItems: 'center' },
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
  pwRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
  },
  pwInput: { flex: 1, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, color: '#1a1a1a' },
  eyeBtn:  { paddingHorizontal: 14 },
  inputError: { borderColor: '#D32F2F', borderRadius: 12 },
  errorText: { fontSize: 13, color: '#D32F2F', marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#2E7D32', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', minHeight: 52, marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // OTP boxes
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
  resendBtn:  { alignItems: 'center', marginTop: 8 },
  resendText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  resendDisabled: { color: '#aaa' },
});
