import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import LanguageToggle from '../../components/LanguageToggle';

type Tab = 'signin' | 'signup';

export default function AuthScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('signin');

  // Sign in state
  const [siPhone, setSiPhone]       = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siShowPw, setSiShowPw]     = useState(false);
  const [siLoading, setSiLoading]   = useState(false);
  const [siErrors, setSiErrors]     = useState<{ phone?: string; password?: string; general?: string }>({});

  // Sign up state
  const [suName, setSuName]         = useState('');
  const [suPhone, setSuPhone]       = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm, setSuConfirm]   = useState('');
  const [suShowPw, setSuShowPw]     = useState(false);
  const [suLoading, setSuLoading]   = useState(false);
  const [suErrors, setSuErrors]     = useState<{ name?: string; phone?: string; password?: string; confirm?: string; general?: string }>({});

  const handleSignIn = async () => {
    const e: typeof siErrors = {};
    if (siPhone.length < 9)     e.phone    = t('auth.invalidPhone');
    if (!siPassword)            e.password = t('auth.passwordRequired') || 'Password is required';
    setSiErrors(e);
    if (Object.keys(e).length > 0) return;

    setSiLoading(true);
    try {
      const result = await api.login('0' + siPhone, siPassword);
      await signIn(result.token, result.user);
    } catch (err: any) {
      if (err.message === 'invalid_credentials') {
        setSiErrors({ general: t('auth.invalidCredentials') || 'Incorrect phone or password' });
      } else {
        setSiErrors({ general: err.message || t('common.error') });
      }
    } finally {
      setSiLoading(false);
    }
  };

  const handleSignUp = async () => {
    const e: typeof suErrors = {};
    if (!suName.trim())           e.name     = t('auth.nameRequired');
    if (suPhone.length < 9)       e.phone    = t('auth.invalidPhone');
    if (suPassword.length < 6)    e.password = t('auth.passwordTooShort') || 'At least 6 characters';
    if (suConfirm !== suPassword) e.confirm  = t('auth.passwordMismatch') || 'Passwords do not match';
    setSuErrors(e);
    if (Object.keys(e).length > 0) return;

    setSuLoading(true);
    setSuErrors({});
    try {
      const result = await api.register('0' + suPhone, suName.trim(), suPassword);
      await signIn(result.token, result.user);
    } catch (err: any) {
      if (err.message === 'phone_taken') {
        setSuErrors({ phone: t('auth.phoneTaken') || 'This phone number is already registered' });
      } else {
        setSuErrors({ general: err.message || t('common.error') });
      }
    } finally {
      setSuLoading(false);
    }
  };

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
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

          {/* Tab switcher */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, tab === 'signin' && styles.tabActive]}
              onPress={() => { setTab('signin'); setSiErrors({}); }}
            >
              <Text style={[styles.tabText, tab === 'signin' && styles.tabTextActive]}>
                {t('auth.signIn')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'signup' && styles.tabActive]}
              onPress={() => { setTab('signup'); setSuErrors({}); }}
            >
              <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>
                {t('auth.signUp')}
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'signin' ? (
            <View style={styles.form}>
              {/* Phone */}
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.enterPhone')}</Text>
                <View style={[styles.phoneRow, siErrors.phone ? styles.inputError : null]}>
                  <View style={styles.prefix}>
                    <Text style={styles.prefixText}>+251</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder={t('auth.phoneHint')}
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={9}
                    value={siPhone}
                    onChangeText={(v) => { setSiPhone(v); setSiErrors(e => ({ ...e, phone: undefined, general: undefined })); }}
                    returnKeyType="next"
                    autoFocus
                  />
                </View>
                {siErrors.phone ? <Text style={styles.errorText}>{siErrors.phone}</Text> : null}
              </View>

              {/* Password */}
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.password') || 'Password'}</Text>
                <View style={[styles.pwRow, siErrors.password ? styles.inputError : null]}>
                  <TextInput
                    style={styles.pwInput}
                    placeholder="••••••"
                    placeholderTextColor="#999"
                    secureTextEntry={!siShowPw}
                    value={siPassword}
                    onChangeText={(v) => { setSiPassword(v); setSiErrors(e => ({ ...e, password: undefined, general: undefined })); }}
                    onSubmitEditing={handleSignIn}
                    returnKeyType="go"
                  />
                  <TouchableOpacity onPress={() => setSiShowPw(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={siShowPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
                {siErrors.password ? <Text style={styles.errorText}>{siErrors.password}</Text> : null}
              </View>

              {siErrors.general ? (
                <View style={styles.generalError}>
                  <Text style={styles.generalErrorText}>{siErrors.general}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.button, siLoading && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={siLoading}
              >
                {siLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.buttonText}>{t('auth.signIn')}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotLink} onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchLink} onPress={() => setTab('signup')}>
                <Text style={styles.switchText}>
                  {t('auth.noAccount')}{' '}
                  <Text style={styles.switchTextBold}>{t('auth.signUp')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              {/* Name */}
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.fullName')}</Text>
                <TextInput
                  style={[styles.input, suErrors.name ? styles.inputError : null]}
                  placeholder={t('auth.fullNameHint')}
                  placeholderTextColor="#999"
                  value={suName}
                  onChangeText={(v) => { setSuName(v); setSuErrors(e => ({ ...e, name: undefined })); }}
                  returnKeyType="next"
                  autoCapitalize="words"
                  autoFocus
                />
                {suErrors.name ? <Text style={styles.errorText}>{suErrors.name}</Text> : null}
              </View>

              {/* Phone */}
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.enterPhone')}</Text>
                <View style={[styles.phoneRow, suErrors.phone ? styles.inputError : null]}>
                  <View style={styles.prefix}>
                    <Text style={styles.prefixText}>+251</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder={t('auth.phoneHint')}
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={9}
                    value={suPhone}
                    onChangeText={(v) => { setSuPhone(v); setSuErrors(e => ({ ...e, phone: undefined })); }}
                    returnKeyType="next"
                  />
                </View>
                {suErrors.phone ? <Text style={styles.errorText}>{suErrors.phone}</Text> : null}
              </View>

              {/* Password */}
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.password') || 'Password'}</Text>
                <View style={[styles.pwRow, suErrors.password ? styles.inputError : null]}>
                  <TextInput
                    style={styles.pwInput}
                    placeholder="••••••"
                    placeholderTextColor="#999"
                    secureTextEntry={!suShowPw}
                    value={suPassword}
                    onChangeText={(v) => { setSuPassword(v); setSuErrors(e => ({ ...e, password: undefined })); }}
                    returnKeyType="next"
                  />
                  <TouchableOpacity onPress={() => setSuShowPw(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={suShowPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
                {suErrors.password ? <Text style={styles.errorText}>{suErrors.password}</Text> : null}
              </View>

              {/* Confirm Password */}
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.confirmPassword') || 'Confirm Password'}</Text>
                <View style={[styles.pwRow, suErrors.confirm ? styles.inputError : null]}>
                  <TextInput
                    style={styles.pwInput}
                    placeholder="••••••"
                    placeholderTextColor="#999"
                    secureTextEntry={!suShowPw}
                    value={suConfirm}
                    onChangeText={(v) => { setSuConfirm(v); setSuErrors(e => ({ ...e, confirm: undefined })); }}
                    onSubmitEditing={handleSignUp}
                    returnKeyType="go"
                  />
                </View>
                {suErrors.confirm ? <Text style={styles.errorText}>{suErrors.confirm}</Text> : null}
              </View>

              {suErrors.general ? (
                <View style={styles.generalError}>
                  <Text style={styles.generalErrorText}>{suErrors.general}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.button, suLoading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={suLoading}
              >
                {suLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.buttonText}>{t('auth.createAccount')}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchLink} onPress={() => setTab('signin')}>
                <Text style={styles.switchText}>
                  {t('auth.haveAccount')}{' '}
                  <Text style={styles.switchTextBold}>{t('auth.signIn')}</Text>
                </Text>
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
    textAlign: 'center', marginBottom: 6,
  },
  subtitle: {
    fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 36,
  },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#F3F4F6',
    borderRadius: 12, padding: 4, marginBottom: 28,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#2E7D32' },
  form: { gap: 0 },
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
  pwRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    backgroundColor: '#fff',
  },
  pwInput: {
    flex: 1, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, color: '#1a1a1a',
  },
  eyeBtn: { paddingHorizontal: 14 },
  inputError: { borderColor: '#D32F2F', borderRadius: 12 },
  errorText: { fontSize: 12, color: '#D32F2F', marginTop: 6 },
  generalError: { backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 16 },
  generalErrorText: { fontSize: 13, color: '#C62828', textAlign: 'center' },
  button: {
    backgroundColor: '#2E7D32', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', minHeight: 52, justifyContent: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  forgotLink: { alignItems: 'center', marginTop: 14 },
  forgotText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  switchLink: { marginTop: 16, alignItems: 'center' },
  switchText: { fontSize: 14, color: '#666' },
  switchTextBold: { color: '#2E7D32', fontWeight: '700' },
});
