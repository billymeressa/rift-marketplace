import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
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
import { isTelegramMiniApp } from '../../lib/telegram-webapp';
import { getTMATheme } from '../../lib/telegram-theme';

const isTMA = Platform.OS === 'web' && typeof window !== 'undefined' && isTelegramMiniApp();
const theme = isTMA ? getTMATheme() : null;

// ─── TMA-style grouped menu row ────────────────────────────────────────────

function MenuRow({
  icon, iconColor, label, value, onPress, isFirst, isLast, destructive,
}: {
  icon: string; iconColor?: string; label: string; value?: string;
  onPress: () => void; isFirst?: boolean; isLast?: boolean; destructive?: boolean;
}) {
  const textColor = destructive
    ? (isTMA ? theme?.destructive : '#D32F2F')
    : (isTMA ? theme?.text : '#333');

  return (
    <TouchableOpacity
      style={[
        menuStyles.row,
        isTMA && { backgroundColor: theme?.card },
        isFirst && menuStyles.rowFirst,
        isLast && menuStyles.rowLast,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isTMA ? theme?.separator : '#eee' },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={destructive ? (isTMA ? theme?.destructive : '#D32F2F') : (iconColor || (isTMA ? theme?.accent : '#2E7D32'))}
      />
      <Text style={[menuStyles.label, { color: textColor }]}>{label}</Text>
      {value && <Text style={[menuStyles.value, isTMA && { color: theme?.hint }]}>{value}</Text>}
      {!destructive && (
        <Ionicons name="chevron-forward" size={16} color={isTMA ? theme?.hint : '#ccc'} />
      )}
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  rowFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  rowLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  label: { fontSize: 15, color: '#333', flex: 1 },
  value: { fontSize: 14, color: '#999' },
});

// ─── Main screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

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
      setPhone(profile.phone || '');
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
      phone: phone.trim() || undefined,
    });
  };

  const isAdmin = user?.phone === process.env.EXPO_PUBLIC_ADMIN_PHONE;

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

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.deleteAccount(),
    onSuccess: () => signOut(),
    onError: (error: any) => {
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const handleDeleteAccount = () => {
    const step2 = () => {
      if (Platform.OS === 'web') {
        if (window.confirm(t('profile.deleteAccountConfirm2'))) {
          deleteAccountMutation.mutate();
        }
        return;
      }
      Alert.alert(
        t('profile.deleteAccount'),
        t('profile.deleteAccountConfirm2'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('profile.deleteAccount'),
            style: 'destructive',
            onPress: () => deleteAccountMutation.mutate(),
          },
        ],
      );
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('profile.deleteAccountConfirm'))) step2();
      return;
    }
    Alert.alert(
      t('profile.deleteAccount'),
      t('profile.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: step2 },
      ],
    );
  };

  const toggleLang = () => {
    const langs = ['en', 'am', 'om'];
    const idx = langs.indexOf(i18n.language);
    const newLang = langs[(idx + 1) % langs.length];
    setLanguage(newLang);
  };

  const langDisplay = i18n.language === 'am' ? 'አማርኛ' : i18n.language === 'om' ? 'Afaan Oromoo' : 'English';

  const ProfileHeader = (
    <View style={[styles.header, isTMA && { paddingTop: 16 }]}>
      {/* Avatar + name */}
      <View style={[styles.avatar, isTMA && { backgroundColor: theme?.accent || '#2E7D32' }]}>
        <Text style={styles.avatarText}>
          {(profile?.name || profile?.phone || '?')[0].toUpperCase()}
        </Text>
      </View>

      {editing ? (
        <View style={styles.editForm}>
          <Text style={[styles.label, isTMA && { color: theme?.subtitle }]}>{t('profile.name')}</Text>
          <TextInput
            style={[styles.input, isTMA && { backgroundColor: theme?.secondaryBg, borderColor: theme?.separator, color: theme?.text }]}
            value={name}
            onChangeText={setName}
            placeholder={t('profile.nameHint')}
            placeholderTextColor={isTMA ? theme?.hint : '#999'}
          />
          <Text style={[styles.label, isTMA && { color: theme?.subtitle }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, isTMA && { backgroundColor: theme?.secondaryBg, borderColor: theme?.separator, color: theme?.text }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+251911234567"
            placeholderTextColor={isTMA ? theme?.hint : '#999'}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.cancelBtn, isTMA && { backgroundColor: theme?.secondaryBg }]}
              onPress={() => setEditing(false)}
            >
              <Text style={[styles.cancelText, isTMA && { color: theme?.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isTMA && { backgroundColor: theme?.button }]}
              onPress={handleSave}
            >
              <Text style={[styles.saveText, isTMA && { color: theme?.buttonText }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.name, isTMA && { color: theme?.text }]}>
            {profile?.name || t('profile.name')}
          </Text>
          <Text style={[styles.phone, isTMA && { color: theme?.accent }]}>{profile?.phone}</Text>

          {user?.id && (
            <View style={styles.trustSection}>
              <TrustBadge userId={user.id} size="large" />
            </View>
          )}

          {verification?.status === 'approved' ? (
            <View style={[styles.verifiedBadge, isTMA && { backgroundColor: (theme?.accent || '#2E7D32') + '18' }]}>
              <Ionicons name="checkmark-circle" size={16} color={isTMA ? theme?.accent : '#2E7D32'} />
              <Text style={[styles.verifiedBadgeText, isTMA && { color: theme?.accent }]}>{t('profile.verified')}</Text>
            </View>
          ) : verification?.status === 'pending' ? (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={16} color="#E65100" />
              <Text style={styles.pendingBadgeText}>{t('profile.pending')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.verifyBtn, isTMA && { backgroundColor: theme?.button }]}
              onPress={() => router.push('/verification')}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={isTMA ? theme?.buttonText : '#fff'} />
              <Text style={[styles.verifyBtnText, isTMA && { color: theme?.buttonText }]}>{t('profile.getVerified')}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ─── Grouped settings menu ─────────────────────────────────── */}
      {!editing && (
        <>
          {/* Section: Settings */}
          <Text style={[styles.sectionLabel, isTMA && { color: theme?.sectionHeader }]}>
            {t('tabs.profile')}
          </Text>
          <View style={[styles.menuGroup, isTMA && { backgroundColor: theme?.card }]}>
            <MenuRow
              icon="create-outline"
              label={t('profile.editProfile')}
              onPress={() => setEditing(true)}
              isFirst
            />
            <MenuRow
              icon="language-outline"
              label={t('profile.language')}
              value={langDisplay}
              onPress={toggleLang}
              isLast
            />
          </View>

          {/* Section: Services */}
          <Text style={[styles.sectionLabel, isTMA && { color: theme?.sectionHeader }]}>
            {i18n.language === 'am' ? 'አገልግሎቶች' : i18n.language === 'om' ? 'Tajaajila' : 'Services'}
          </Text>
          <View style={[styles.menuGroup, isTMA && { backgroundColor: theme?.card }]}>
            <MenuRow
              icon="wallet-outline"
              label={t('depositVerification.title')}
              onPress={() => router.push('/deposit-verification')}
              isFirst
            />
            <MenuRow
              icon="chatbubble-ellipses-outline"
              label={i18n.language === 'am' ? 'አስተያየት ላክ' : i18n.language === 'om' ? 'Yaada Ergi' : 'Send Feedback'}
              onPress={() => router.push('/feedback')}
              isLast={!isAdmin}
            />
            {isAdmin && (
              <MenuRow
                icon="shield-checkmark"
                iconColor={isTMA ? theme?.buttonText : '#fff'}
                label="Admin Panel"
                onPress={() => router.push('/admin')}
                isLast
              />
            )}
          </View>

          {/* Section: Account */}
          <Text style={[styles.sectionLabel, isTMA && { color: theme?.sectionHeader }]}>
            {i18n.language === 'am' ? 'መለያ' : i18n.language === 'om' ? 'Herrega' : 'Account'}
          </Text>
          <View style={[styles.menuGroup, isTMA && { backgroundColor: theme?.card }]}>
            <MenuRow
              icon="log-out-outline"
              label={t('profile.logout')}
              onPress={handleLogout}
              destructive
              isFirst
            />
            <MenuRow
              icon="trash-outline"
              label={t('profile.deleteAccount')}
              onPress={handleDeleteAccount}
              destructive
              isLast
            />
          </View>

          {/* My Listings */}
          <Text style={[styles.sectionLabel, isTMA && { color: theme?.sectionHeader }, { marginTop: 20 }]}>
            {t('listing.myListings')}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <ResponsiveContainer style={[styles.container, isTMA && { backgroundColor: theme?.secondaryBg }]}>
      <FlatList
        style={{ flex: 1 }}
        data={editing ? [] : (myListings?.data || [])}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: isTMA ? 12 : 16, marginBottom: 8 }}>
            <ListingCard listing={item} />
          </View>
        )}
        ListHeaderComponent={ProfileHeader}
        ListEmptyComponent={
          !editing ? (
            <Text style={[styles.emptyText, isTMA && { color: theme?.hint }]}>{t('listing.noListings')}</Text>
          ) : null
        }
        contentContainerStyle={[styles.listContent, isTMA && { paddingBottom: 60 }]}
      />
    </ResponsiveContainer>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
  trustSection: {
    marginTop: 10,
    width: '100%',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#2E7D32',
    borderRadius: 16,
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Grouped menu
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    alignSelf: 'flex-start',
    marginTop: 20,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  menuGroup: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 20,
  },
});
