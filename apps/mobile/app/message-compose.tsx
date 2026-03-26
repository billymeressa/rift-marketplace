import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

export default function MessageComposeScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => api.getListing(listingId!),
    enabled: !!listingId,
  });

  const mutation = useMutation({
    mutationFn: () => api.startConversation(listingId!, message.trim()),
    onSuccess: ({ conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Navigate to the chat
      router.replace(`/chat/${conversationId}`);
    },
    onError: (error: any) => {
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    mutation.mutate();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('messages.sendMessage'), presentation: 'card' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Listing context */}
          {isLoading ? (
            <ActivityIndicator size="small" color="#2E7D32" style={{ marginBottom: 16 }} />
          ) : listing ? (
            <View style={styles.listingCard}>
              <Ionicons name="pricetag-outline" size={16} color="#2E7D32" />
              <View style={{ flex: 1 }}>
                <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
                {listing.price && (
                  <Text style={styles.listingPrice}>
                    {Number(listing.price).toLocaleString()} {listing.currency}
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          {/* Recipient */}
          {listing?.user && (
            <View style={styles.recipientRow}>
              <View style={styles.recipientAvatar}>
                <Text style={styles.recipientAvatarText}>S</Text>
              </View>
              <Text style={styles.recipientName}>Seller</Text>
            </View>
          )}

          {/* Message input */}
          <Text style={styles.label}>{t('messages.messagePlaceholder')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('messages.firstMessageHint')}
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            maxLength={2000}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!message.trim() || mutation.isPending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.sendBtnText}>{t('messages.sendMessage')}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 12,
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  listingPrice: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recipientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
    minHeight: 120,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
