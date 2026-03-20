import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../lib/i18n';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  return (
    <View style={styles.toggle}>
      <TouchableOpacity onPress={() => setLanguage('en')}>
        <Text style={[styles.lang, current === 'en' && styles.activeLang]}>EN</Text>
      </TouchableOpacity>
      <Text style={styles.separator}>|</Text>
      <TouchableOpacity onPress={() => setLanguage('am')}>
        <Text style={[styles.lang, current === 'am' && styles.activeLang]}>አማ</Text>
      </TouchableOpacity>
      <Text style={styles.separator}>|</Text>
      <TouchableOpacity onPress={() => setLanguage('om')}>
        <Text style={[styles.lang, current === 'om' && styles.activeLang]}>ORO</Text>
      </TouchableOpacity>
    </View>
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
