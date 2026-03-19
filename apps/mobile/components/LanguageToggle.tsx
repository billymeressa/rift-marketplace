import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../lib/i18n';

const LANGS = ['en', 'am', 'om'] as const;

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  const toggle = () => {
    const idx = LANGS.indexOf(current as typeof LANGS[number]);
    const next = LANGS[(idx + 1) % LANGS.length];
    setLanguage(next);
  };

  return (
    <TouchableOpacity style={styles.toggle} onPress={toggle}>
      <Text style={[styles.lang, current === 'en' && styles.activeLang]}>EN</Text>
      <Text style={styles.separator}>|</Text>
      <Text style={[styles.lang, current === 'am' && styles.activeLang]}>አማ</Text>
      <Text style={styles.separator}>|</Text>
      <Text style={[styles.lang, current === 'om' && styles.activeLang]}>ORO</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  lang: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  activeLang: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  separator: {
    marginHorizontal: 4,
    color: '#ccc',
  },
});
