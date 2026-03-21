import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [inputText, setInputText] = useState('');

  // Fetch messages
  const { data, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.getMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 5000, // Poll every 5s while chat is open
  });

  // Fetch conversations to get context
  const { data: convsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
  });

  const conversation = convsData?.data?.find((c: any) => c.id === conversationId);

  // Messages come in desc order from API — reverse for display
  const messagesDesc = data?.data || [];
  const messagesAsc = [...messagesDesc].reverse();

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (body: string) => api.sendMessage(conversationId!, body),
    onSuccess: (newMsg) => {
      // Optimistically add message to the list
      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return { data: [newMsg] };
        return { data: [newMsg, ...old.data] };
      });
      // Invalidate conversations list for updated last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setInputText('');
    },
  });

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  }, [inputText, sendMutation]);

  // Mark conversation as read when entering
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
  }, [conversationId]);

  // Group messages by date for headers
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.senderId === user?.id;
    const prevMessage = index > 0 ? messagesAsc[index - 1] : null;

    // Show date header if date changed
    const msgDate = new Date(item.createdAt).toDateString();
    const prevDate = prevMessage ? new Date(prevMessage.createdAt).toDateString() : null;
    const showDateHeader = msgDate !== prevDate;

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{formatDateHeader(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
          <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
              {item.body}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isMe ? styles.timeMe : styles.timeOther]}>
                {formatMessageTime(item.createdAt)}
              </Text>
              {isMe && (
                <Ionicons
                  name={item.readAt ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={item.readAt ? '#81C784' : 'rgba(255,255,255,0.5)'}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: conversation?.otherUser?.name || conversation?.listingTitle || '',
          headerBackTitle: t('messages.title'),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Listing context bar */}
        {conversation?.listingTitle && (
          <TouchableOpacity
            style={styles.contextBar}
            onPress={() => router.push(`/listing/${conversation.listingId}`)}
          >
            <Ionicons name="pricetag-outline" size={14} color="#2E7D32" />
            <Text style={styles.contextText} numberOfLines={1}>
              {conversation.listingTitle}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#999" />
          </TouchableOpacity>
        )}

        {/* Messages list */}
        <FlatList
          ref={flatListRef}
          data={messagesAsc}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color="#ccc" />
              <Text style={styles.emptyChatText}>{t('messages.firstMessageHint')}</Text>
            </View>
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder={t('messages.messagePlaceholder')}
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sendMutation.isPending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sendMutation.isPending}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E8F5E9',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  contextText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#2E7D32',
  },
  messagesList: {
    padding: 12,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    fontWeight: '500',
  },
  messageRow: {
    marginVertical: 2,
    maxWidth: '80%',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: '#2E7D32',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageTextOther: {
    color: '#1a1a1a',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 11,
  },
  timeMe: {
    color: 'rgba(255,255,255,0.6)',
  },
  timeOther: {
    color: '#999',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#FAFAFA',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#A5D6A7',
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyChatText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
