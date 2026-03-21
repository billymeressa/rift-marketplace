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
  example: string; // example local number (for placeholder)
}

const COUNTRIES: Country[] = [
  // ── East Africa (most relevant) ──────────────────────────────────────────
  { code: 'ET', dial: '+251', flag: '🇪🇹', name: 'Ethiopia',            example: '911234567'   },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya',               example: '712345678'   },
  { code: 'TZ', dial: '+255', flag: '🇹🇿', name: 'Tanzania',            example: '712345678'   },
  { code: 'UG', dial: '+256', flag: '🇺🇬', name: 'Uganda',              example: '712345678'   },
  { code: 'RW', dial: '+250', flag: '🇷🇼', name: 'Rwanda',              example: '781234567'   },
  { code: 'SO', dial: '+252', flag: '🇸🇴', name: 'Somalia',             example: '61234567'    },
  { code: 'SD', dial: '+249', flag: '🇸🇩', name: 'Sudan',               example: '911234567'   },
  { code: 'SS', dial: '+211', flag: '🇸🇸', name: 'South Sudan',         example: '912345678'   },
  { code: 'ER', dial: '+291', flag: '🇪🇷', name: 'Eritrea',             example: '7123456'     },
  { code: 'DJ', dial: '+253', flag: '🇩🇯', name: 'Djibouti',            example: '77123456'    },
  // ── Rest of Africa ────────────────────────────────────────────────────────
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria',             example: '8012345678'  },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana',               example: '241234567'   },
  { code: 'ZA', dial: '+27',  flag: '🇿🇦', name: 'South Africa',        example: '712345678'   },
  { code: 'EG', dial: '+20',  flag: '🇪🇬', name: 'Egypt',               example: '1012345678'  },
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'Morocco',             example: '612345678'   },
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'Tunisia',             example: '20123456'    },
  { code: 'DZ', dial: '+213', flag: '🇩🇿', name: 'Algeria',             example: '551234567'   },
  { code: 'CM', dial: '+237', flag: '🇨🇲', name: 'Cameroon',            example: '671234567'   },
  { code: 'CI', dial: '+225', flag: '🇨🇮', name: "Côte d'Ivoire",       example: '0712345678'  },
  { code: 'SN', dial: '+221', flag: '🇸🇳', name: 'Senegal',             example: '771234567'   },
  { code: 'ZM', dial: '+260', flag: '🇿🇲', name: 'Zambia',              example: '971234567'   },
  { code: 'ZW', dial: '+263', flag: '🇿🇼', name: 'Zimbabwe',            example: '712345678'   },
  { code: 'MZ', dial: '+258', flag: '🇲🇿', name: 'Mozambique',          example: '841234567'   },
  // ── Middle East ───────────────────────────────────────────────────────────
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE',                 example: '501234567'   },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia',        example: '512345678'   },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar',               example: '33123456'    },
  { code: 'KW', dial: '+965', flag: '🇰🇼', name: 'Kuwait',              example: '50012345'    },
  { code: 'BH', dial: '+973', flag: '🇧🇭', name: 'Bahrain',             example: '36001234'    },
  { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman',                example: '92123456'    },
  { code: 'JO', dial: '+962', flag: '🇯🇴', name: 'Jordan',              example: '791234567'   },
  { code: 'IL', dial: '+972', flag: '🇮🇱', name: 'Israel',              example: '501234567'   },
  { code: 'TR', dial: '+90',  flag: '🇹🇷', name: 'Turkey',              example: '5012345678'  },
  // ── Asia ──────────────────────────────────────────────────────────────────
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India',               example: '9812345678'  },
  { code: 'CN', dial: '+86',  flag: '🇨🇳', name: 'China',               example: '13112345678' },
  { code: 'JP', dial: '+81',  flag: '🇯🇵', name: 'Japan',               example: '9012345678'  },
  { code: 'KR', dial: '+82',  flag: '🇰🇷', name: 'South Korea',         example: '1012345678'  },
  { code: 'PK', dial: '+92',  flag: '🇵🇰', name: 'Pakistan',            example: '3012345678'  },
  { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh',          example: '1712345678'  },
  { code: 'LK', dial: '+94',  flag: '🇱🇰', name: 'Sri Lanka',           example: '712345678'   },
  { code: 'MY', dial: '+60',  flag: '🇲🇾', name: 'Malaysia',            example: '121234567'   },
  { code: 'SG', dial: '+65',  flag: '🇸🇬', name: 'Singapore',           example: '81234567'    },
  { code: 'ID', dial: '+62',  flag: '🇮🇩', name: 'Indonesia',           example: '81234567890' },
  { code: 'TH', dial: '+66',  flag: '🇹🇭', name: 'Thailand',            example: '812345678'   },
  { code: 'VN', dial: '+84',  flag: '🇻🇳', name: 'Vietnam',             example: '9012345678'  },
  { code: 'PH', dial: '+63',  flag: '🇵🇭', name: 'Philippines',         example: '9171234567'  },
  // ── Europe ────────────────────────────────────────────────────────────────
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'United Kingdom',      example: '7911123456'  },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Germany',             example: '15112345678' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'France',              example: '612345678'   },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Italy',               example: '3123456789'  },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Spain',               example: '612345678'   },
  { code: 'PT', dial: '+351', flag: '🇵🇹', name: 'Portugal',            example: '912345678'   },
  { code: 'NL', dial: '+31',  flag: '🇳🇱', name: 'Netherlands',         example: '612345678'   },
  { code: 'BE', dial: '+32',  flag: '🇧🇪', name: 'Belgium',             example: '471234567'   },
  { code: 'CH', dial: '+41',  flag: '🇨🇭', name: 'Switzerland',         example: '781234567'   },
  { code: 'AT', dial: '+43',  flag: '🇦🇹', name: 'Austria',             example: '6641234567'  },
  { code: 'SE', dial: '+46',  flag: '🇸🇪', name: 'Sweden',              example: '701234567'   },
  { code: 'NO', dial: '+47',  flag: '🇳🇴', name: 'Norway',              example: '41234567'    },
  { code: 'DK', dial: '+45',  flag: '🇩🇰', name: 'Denmark',             example: '20123456'    },
  { code: 'FI', dial: '+358', flag: '🇫🇮', name: 'Finland',             example: '401234567'   },
  { code: 'PL', dial: '+48',  flag: '🇵🇱', name: 'Poland',              example: '512345678'   },
  { code: 'RU', dial: '+7',   flag: '🇷🇺', name: 'Russia',              example: '9121234567'  },
  { code: 'UA', dial: '+380', flag: '🇺🇦', name: 'Ukraine',             example: '501234567'   },
  { code: 'GR', dial: '+30',  flag: '🇬🇷', name: 'Greece',              example: '6912345678'  },
  // ── Americas ──────────────────────────────────────────────────────────────
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'United States',       example: '2015551234'  },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canada',              example: '6135551234'  },
  { code: 'MX', dial: '+52',  flag: '🇲🇽', name: 'Mexico',              example: '5512345678'  },
  { code: 'BR', dial: '+55',  flag: '🇧🇷', name: 'Brazil',              example: '11912345678' },
  { code: 'AR', dial: '+54',  flag: '🇦🇷', name: 'Argentina',           example: '1112345678'  },
  { code: 'CO', dial: '+57',  flag: '🇨🇴', name: 'Colombia',            example: '3112345678'  },
  // ── Oceania ───────────────────────────────────────────────────────────────
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australia',           example: '412345678'   },
  { code: 'NZ', dial: '+64',  flag: '🇳🇿', name: 'New Zealand',         example: '211234567'   },
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
  const [devCode, setDevCode] = useState<string | null>(null);
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

  // Strip leading zeros (local trunk prefix) before combining with dial code
  // e.g. UK "07911123456" → "+447911123456"
  const localNumber = phone.replace(/^0+/, '');
  const fullPhone = country.dial + localNumber;

  // Helper: clean a raw input value into a pure local number for the current country.
  // Handles paste of full international numbers (e.g. "+447911123456" → "7911123456")
  // without accidentally stripping digits from local numbers that start with the same
  // digits as the country code (the classic +1 / US problem).
  const cleanPhoneInput = (raw: string, selectedCountry: Country): string => {
    // Keep only digits
    let digits = raw.replace(/\D/g, '');
    const dialDigits = selectedCountry.dial.replace(/\D/g, ''); // e.g. "44" for "+44"
    // Only strip country-code prefix when the pasted string is clearly longer than a
    // local number alone (i.e. its length equals local + dial digits). Using the example
    // number length as a proxy for the expected local-number length avoids stripping a
    // leading "1" from a genuine US local number like "1512345678".
    const expectedFullLen = dialDigits.length + selectedCountry.example.length;
    if (digits.startsWith(dialDigits) && digits.length >= expectedFullLen) {
      digits = digits.slice(dialDigits.length);
    }
    return digits.slice(0, 15);
  };

  // ── Step 1: Enter phone ──────────────────────────────────────────────────
  const handlePhoneSubmit = async () => {
    if (localNumber.length < 5 || localNumber.length > 14) {
      setError('Please enter a valid phone number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await api.sendCode(fullPhone);
      setTelegramLink(result.telegramLink);
      setDevCode(result.devCode ?? null);
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
      setDevCode(result.devCode ?? null);
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
      setDevCode(result.devCode ?? null);
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

              {/* ── Primary CTA: Sign in with Telegram ── */}
              <TouchableOpacity
                style={[styles.telegramSocialBtn, loading && styles.buttonDisabled]}
                onPress={handlePhoneSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <View style={styles.telegramSocialIcon}>
                      <Ionicons name="paper-plane" size={19} color="#fff" />
                    </View>
                    <Text style={styles.telegramSocialText}>Sign in with Telegram</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* ── Divider ── */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or enter your phone number</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── Phone input ── */}
              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.enterPhone')}</Text>
                <View style={[styles.phoneRow, error ? styles.inputError : null]}>
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
                    placeholder={`e.g. ${country.example}`}
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(v) => {
                      setPhone(cleanPhoneInput(v, country));
                      setError('');
                    }}
                    onSubmitEditing={handlePhoneSubmit}
                    returnKeyType="go"
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
                style={[styles.telegramSocialBtn, (!name.trim() || loading) && styles.buttonDisabled]}
                onPress={handleNameSubmit}
                disabled={!name.trim() || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <View style={styles.telegramSocialIcon}>
                      <Ionicons name="paper-plane" size={19} color="#fff" />
                    </View>
                    <Text style={styles.telegramSocialText}>Sign up with Telegram</Text>
                  </>
                )}
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

              {/* Dev mode: show OTP directly when no Telegram bot is configured */}
              {devCode && (
                <View style={styles.devCodeBanner}>
                  <Ionicons name="code-slash-outline" size={16} color="#b45309" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.devCodeLabel}>Dev mode — no Telegram bot configured</Text>
                    <Text style={styles.devCodeValue}>{devCode}</Text>
                  </View>
                </View>
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
        onSelect={(c) => { setCountry(c); setPhone(''); setError(''); }}
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
  // Social login button — Telegram (filled, matches Facebook/Google social login style)
  telegramSocialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2AABEE',   // official Telegram blue
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#2AABEE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 4,
  },
  telegramSocialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  telegramSocialText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: 44, // offset for the icon so text is visually centred
  },
  // "or enter your phone number" divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8E8E8' },
  dividerText: { fontSize: 12, color: '#aaa', fontWeight: '500' },
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
  devCodeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  devCodeLabel: { fontSize: 11, color: '#92400e', fontWeight: '600', marginBottom: 4 },
  devCodeValue: { fontSize: 28, fontWeight: '800', color: '#b45309', letterSpacing: 6 },
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
