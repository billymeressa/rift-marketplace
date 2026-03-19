import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import LanguageToggle from '../../components/LanguageToggle';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; name?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (name.trim().length === 0) e.name = t('auth.nameRequired');
    if (phone.length < 9) e.phone = t('auth.invalidPhone');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const result = await api.register('0' + phone, name.trim());
      await signIn(result.token, result.user);
    } catch (err: any) {
      setErrors({ general: err.message || t('common.error') });
    } finally {
      setLoading(false);
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
          <Text style={styles.welcome}>{t('auth.welcome')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.fullName')}</Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              placeholder={t('auth.fullNameHint')}
              placeholderTextColor="#999"
              value={name}
              onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined })); }}
              returnKeyType="next"
              autoCapitalize="words"
              autoFocus
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.enterPhone')}</Text>
            <View style={[styles.phoneRow, errors.phone ? styles.phoneRowError : null]}>
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
                onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: undefined })); }}
                onSubmitEditing={handleRegister}
                returnKeyType="go"
              />
            </View>
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          {errors.general ? (
            <View style={styles.generalError}>
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.getStarted')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flexGrow: 1,
  },
  langToggle: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 48,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcome: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
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
  inputError: {
    borderColor: '#D32F2F',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneRowError: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D32F2F',
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
  prefixText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
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
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 6,
  },
  generalError: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  generalErrorText: {
    fontSize: 13,
    color: '#C62828',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
