import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { setLanguage } from '../../lib/i18n';
import ListingCard from '../../components/ListingCard';
import TrustBadge from '../../components/TrustBadge';
import { useRouter } from 'expo-router';
import ResponsiveContainer from '../../components/ResponsiveContainer';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [telegram, setTelegram] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  });

  const { data: myListings } = useQuery({
    queryKey: ['myListings'],
    queryFn: () => api.getListings({ userId: user?.id }),
    enabled: !!user?.id,
  });

  const { data: verification } = useQuery({
    queryKey: ['myVerification'],
    queryFn: () => api.getMyVerification(),
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setTelegram(profile.telegramUsername || '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
    },
    onError: (error: any) => {
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: name.trim(),
      telegramUsername: telegram.trim() || undefined,
    });
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('profile.logoutConfirm'))) signOut();
      return;
    }
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: signOut },
    ]);
  };

  const toggleLang = () => {
    const langs = ['en', 'am', 'om'];
    const idx = langs.indexOf(i18n.language);
    const newLang = langs[(idx + 1) % langs.length];
    setLanguage(newLang);
  };

  return (
    <ResponsiveContainer style={styles.container}>
    <FlatList
      style={{ flex: 1 }}
      data={myListings?.data || []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ListingCard listing={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.name || profile?.phone || '?')[0].toUpperCase()}
            </Text>
          </View>

          {editing ? (
            <View style={styles.editForm}>
              <Text style={styles.label}>{t('profile.name')}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('profile.nameHint')}
                placeholderTextColor="#999"
              />
              <Text style={styles.label}>{t('profile.telegramUsername')}</Text>
              <TextInput
                style={styles.input}
                value={telegram}
                onChangeText={setTelegram}
                placeholder={t('profile.telegramHint')}
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.name}>{profile?.name || t('profile.name')}</Text>
              <Text style={styles.phone}>{profile?.phone}</Text>
              {profile?.telegramUsername && (
                <Text style={styles.telegram}>@{profile.telegramUsername}</Text>
              )}

              {user?.id && (
                <View style={styles.trustSection}>
                  <TrustBadge userId={user.id} size="large" />
                </View>
              )}

              {verification?.status === 'approved' ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
                  <Text style={styles.verifiedBadgeText}>{t('profile.verified')}</Text>
                </View>
              ) : verification?.status === 'pending' ? (
                <View style={styles.pendingBadge}>
                  <Ionicons name="time-outline" size={18} color="#E65100" />
                  <Text style={styles.pendingBadgeText}>{t('profile.pending')}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => router.push('/verification')}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.verifyBtnText}>{t('profile.getVerified')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <Ionicons name="pencil-outline" size={16} color="#2E7D32" />
                <Text style={styles.editText}>{t('profile.editProfile')}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.langBtn} onPress={toggleLang}>
            <Ionicons name="language-outline" size={20} color="#333" />
            <Text style={styles.langText}>{t('profile.language')}</Text>
            <Text style={styles.langValue}>{i18n.language === 'am' ? 'አማርኛ' : i18n.language === 'om' ? 'Afaan Oromoo' : 'English'}</Text>
            <Ionicons name="swap-horizontal-outline" size={18} color="#2E7D32" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.feedbackBtn}
            onPress={() => router.push('/deposit-verification')}
          >
            <Ionicons name="wallet-outline" size={20} color="#333" />
            <Text style={styles.feedbackText}>{t('depositVerification.title')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.feedbackBtn}
            onPress={() => router.push('/feedback')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#333" />
            <Text style={styles.feedbackText}>
              {i18n.language === 'am' ? 'አስተያየት ላክ' : i18n.language === 'om' ? 'Yaada Ergi' : 'Send Feedback'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>{t('listing.myListings')}</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>{t('listing.noListings')}</Text>
      }
      contentContainerStyle={styles.listContent}
    />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  listContent: {
    paddingBottom: 80,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  telegram: {
    fontSize: 14,
    color: '#0088cc',
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
  },
  editText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  editForm: {
    width: '100%',
    marginTop: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  langText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  langValue: {
    fontSize: 14,
    color: '#666',
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  feedbackText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutText: {
    fontSize: 15,
    color: '#D32F2F',
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    alignSelf: 'flex-start',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 20,
  },
  trustSection: {
    marginTop: 12,
    width: '100%',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
  },
  verifiedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E65100',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2E7D32',
    borderRadius: 20,
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
