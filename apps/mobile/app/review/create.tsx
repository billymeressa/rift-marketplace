import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import StarRating from '../../components/StarRating';

export default function CreateReviewScreen() {
  const { orderId, revieweeId } = useLocalSearchParams<{
    orderId: string;
    revieweeId: string;
  }>();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => api.createReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userReviews', revieweeId] });
      queryClient.invalidateQueries({ queryKey: ['userTrust', revieweeId] });
      Alert.alert(t('common.success'), t('review.submitted'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('', error.message || t('common.error'));
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('', `${t('review.rating')} ${t('common.required')}`);
      return;
    }

    const payload: any = {
      orderId,
      rating,
    };
    if (comment.trim()) {
      payload.comment = comment.trim();
    }

    mutation.mutate(payload);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.heading}>{t('review.leaveReview')}</Text>

        {/* Star Rating */}
        <Text style={styles.label}>{t('review.rating')} *</Text>
        <View style={styles.ratingContainer}>
          <StarRating rating={rating} editable size={36} onChange={setRating} />
        </View>

        {/* Comment */}
        <Text style={styles.label}>{t('review.comment')}</Text>
        <TextInput
          style={styles.textArea}
          placeholder={t('review.commentHint')}
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
          maxLength={1000}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          <Text style={styles.submitText}>
            {mutation.isPending ? t('common.loading') : t('review.leaveReview')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1D21',
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginTop: 16,
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1D21',
    backgroundColor: '#FAFAFA',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#1B4332',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
