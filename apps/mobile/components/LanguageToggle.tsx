import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../lib/i18n';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'am', label: 'አማ' },
  { code: 'om', label: 'ORO' },
] as const;

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  return (
    <View style={styles.toggle}>
      {LANGS.map(({ code, label }, index) => (
        <TouchableOpacity
          key={code}
          style={[
            styles.btn,
            current === code && styles.btnActive,
            index < LANGS.length - 1 && styles.btnBorder,
          ]}
          onPress={() => setLanguage(code)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.lang, current === code && styles.activeLang]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 38,
  },
  btnActive: {
    backgroundColor: '#ECFDF5',
  },
  btnBorder: {
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  lang: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeLang: {
    color: '#1B4332',
    fontWeight: '700',
  },
});
