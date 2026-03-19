import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import LanguageToggle from '../../components/LanguageToggle';

type Tab = 'signin' | 'signup';

export default function AuthScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [tab, setTab] = useState<Tab>('signin');

  // Sign in state
  const [siPhone, setSiPhone] = useState('');
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState('');

  // Sign up state
  const [suName, setSuName] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suLoading, setSuLoading] = useState(false);
  const [suErrors, setSuErrors] = useState<{ name?: string; phone?: string; general?: string }>({});

  const handleSignIn = async () => {
    setSiError('');
    if (siPhone.length < 9) {
      setSiError(t('auth.invalidPhone'));
      return;
    }
    setSiLoading(true);
    try {
      const result = await api.login('0' + siPhone);
      await signIn(result.token, result.user);
    } catch (err: any) {
      if (err.message === 'account_not_found') {
        setSiError(t('auth.accountNotFound'));
      } else {
        setSiError(err.message || t('common.error'));
      }
    } finally {
      setSiLoading(false);
    }
  };

  const handleSignUp = async () => {
    const e: typeof suErrors = {};
    if (suName.trim().length === 0) e.name = t('auth.nameRequired');
    if (suPhone.length < 9) e.phone = t('auth.invalidPhone');
    setSuErrors(e);
    if (Object.keys(e).length > 0) return;

    setSuLoading(true);
    setSuErrors({});
    try {
      const result = await api.register('0' + suPhone, suName.trim());
      await signIn(result.token, result.user);
    } catch (err: any) {
      setSuErrors({ general: err.message || t('common.error') });
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
              onPress={() => { setTab('signin'); setSiError(''); }}
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
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.enterPhone')}</Text>
                <View style={[styles.phoneRow, siError ? styles.inputError : null]}>
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
                    onChangeText={(v) => { setSiPhone(v); setSiError(''); }}
                    onSubmitEditing={handleSignIn}
                    returnKeyType="go"
                    autoFocus
                  />
                </View>
                {siError ? <Text style={styles.errorText}>{siError}</Text> : null}
              </View>

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

              <TouchableOpacity style={styles.switchLink} onPress={() => setTab('signup')}>
                <Text style={styles.switchText}>
                  {t('auth.noAccount')}{' '}
                  <Text style={styles.switchTextBold}>{t('auth.signUp')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.fullName')}</Text>
                <TextInput
                  style={[styles.input, suErrors.name ? styles.inputError : null]}
                  placeholder={t('auth.fullNameHint')}
                  placeholderTextColor="#999"
                  value={suName}
                  onChangeText={(v) => { setSuName(v); setSuErrors((e) => ({ ...e, name: undefined })); }}
                  returnKeyType="next"
                  autoCapitalize="words"
                  autoFocus
                />
                {suErrors.name ? <Text style={styles.errorText}>{suErrors.name}</Text> : null}
              </View>

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
                    onChangeText={(v) => { setSuPhone(v); setSuErrors((e) => ({ ...e, phone: undefined })); }}
                    onSubmitEditing={handleSignUp}
                    returnKeyType="go"
                  />
                </View>
                {suErrors.phone ? <Text style={styles.errorText}>{suErrors.phone}</Text> : null}
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
    fontSize: 36,
    fontWeight: '800',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 36,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#2E7D32',
  },
  form: { gap: 0 },
  field: { marginBottom: 18 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#1a1a1a',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRightWidth: 0,
  },
  prefixText: { fontSize: 16, color: '#333', fontWeight: '600' },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#1a1a1a',
  },
  inputError: {
    borderColor: '#D32F2F',
    borderRadius: 12,
  },
  errorText: { fontSize: 12, color: '#D32F2F', marginTop: 6 },
  generalError: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  generalErrorText: { fontSize: 13, color: '#C62828', textAlign: 'center' },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchLink: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 14, color: '#666' },
  switchTextBold: { color: '#2E7D32', fontWeight: '700' },
});
