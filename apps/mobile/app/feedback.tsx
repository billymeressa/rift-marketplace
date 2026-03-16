import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

const FEEDBACK_TYPES = [
  { value: 'bug',        icon: 'bug-outline' as const,         en: 'Bug Report',      am: 'ስህተት ሪፖርት' },
  { value: 'feature',   icon: 'bulb-outline' as const,        en: 'Feature Request', am: 'አዲስ ባህሪ' },
  { value: 'general',   icon: 'chatbubble-outline' as const,   en: 'General',         am: 'አጠቃላይ' },
  { value: 'complaint', icon: 'warning-outline' as const,      en: 'Complaint',       am: 'ቅሬታ' },
];

const NPS_LABELS: Record<number, { en: string; am: string }> = {
  1:  { en: 'Very unlikely', am: 'በጣም ዝቅተኛ' },
  5:  { en: 'Neutral',       am: 'መካከለኛ' },
  10: { en: 'Very likely',   am: 'በጣም ከፍተኛ' },
};

export default function FeedbackScreen() {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'am';
  const router = useRouter();

  const [type, setType]       = useState('general');
  const [message, setMessage] = useState('');
  const [nps, setNps]         = useState(0);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() && nps === 0) {
      Alert.alert('', lang === 'am' ? 'እባክዎ አስተያየት ያስገቡ' : 'Please enter your feedback');
      return;
    }

    setSending(true);
    // TODO: wire to /api/v1/feedback once endpoint is added
    // For now, simulate success
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);

    Alert.alert(
      lang === 'am' ? 'አመሰግናለሁ!' : 'Thank you!',
      lang === 'am'
        ? 'አስተያየትዎ ደርሷል። ለማሻሻል እንጠቀምበታለን።'
        : 'Your feedback has been received. We\'ll use it to improve Rift.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Type selector */}
        <Text style={styles.label}>
          {lang === 'am' ? 'የአስተያየት ዓይነት' : 'Feedback type'}
        </Text>
        <View style={styles.typeRow}>
          {FEEDBACK_TYPES.map((ft) => (
            <TouchableOpacity
              key={ft.value}
              style={[styles.typeBtn, type === ft.value && styles.typeBtnActive]}
              onPress={() => setType(ft.value)}
            >
              <Ionicons
                name={ft.icon}
                size={20}
                color={type === ft.value ? '#2E7D32' : '#888'}
              />
              <Text style={[styles.typeText, type === ft.value && styles.typeTextActive]}>
                {ft[lang]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* NPS */}
        <Text style={styles.label}>
          {lang === 'am'
            ? 'ሪፍትን ለሌሎች የመምከር ዕድል ምን ያህል ነው? (1-10)'
            : 'How likely are you to recommend Rift? (1–10)'}
        </Text>
        <View style={styles.npsRow}>
          {[1,2,3,4,5,6,7,8,9,10].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.npsBtn, nps === n && styles.npsBtnActive]}
              onPress={() => setNps(n)}
            >
              <Text style={[styles.npsText, nps === n && styles.npsTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {nps > 0 && (
          <Text style={styles.npsCaption}>
            {NPS_LABELS[nps <= 2 ? 1 : nps <= 7 ? 5 : 10]?.[lang]}
          </Text>
        )}

        {/* Message */}
        <Text style={styles.label}>
          {lang === 'am' ? 'አስተያየትዎን ያስገቡ' : 'Your feedback'}
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder={
            lang === 'am'
              ? 'ምን ልናሻሽለው ይፈልጋሉ? ምን ጥሩ ነው?'
              : 'What should we improve? What works well?'
          }
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={5}
          value={message}
          onChangeText={setMessage}
          maxLength={1000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{message.length}/1000</Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, sending && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={sending}
        >
          <Text style={styles.submitText}>
            {sending
              ? (lang === 'am' ? 'በመላክ ላይ...' : 'Sending...')
              : (lang === 'am' ? 'አስተያየት ላክ' : 'Send Feedback')}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fff' },
  content:     { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 14, fontWeight: '600', color: '#555',
    marginBottom: 10, marginTop: 20,
  },
  typeRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#E0E0E0', backgroundColor: '#F5F5F5',
  },
  typeBtnActive:  { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  typeText:       { fontSize: 13, color: '#888' },
  typeTextActive: { color: '#2E7D32', fontWeight: '600' },
  npsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  npsBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#F5F5F5',
  },
  npsBtnActive:  { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  npsText:       { fontSize: 14, fontWeight: '600', color: '#555' },
  npsTextActive: { color: '#fff' },
  npsCaption:    { fontSize: 12, color: '#888', marginTop: 6 },
  textArea: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1a1a1a', backgroundColor: '#FAFAFA',
    minHeight: 120,
  },
  charCount:    { fontSize: 11, color: '#bbb', textAlign: 'right', marginTop: 4 },
  submitBtn: {
    backgroundColor: '#2E7D32', paddingVertical: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 28,
  },
  submitDisabled: { opacity: 0.6 },
  submitText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
