import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../lib/i18n';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  const toggle = () => {
    setLanguage(isAmharic ? 'en' : 'am');
  };

  return (
    <TouchableOpacity style={styles.toggle} onPress={toggle}>
      <Text style={[styles.lang, !isAmharic && styles.activeLang]}>EN</Text>
      <Text style={styles.separator}>|</Text>
      <Text style={[styles.lang, isAmharic && styles.activeLang]}>አማ</Text>
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
