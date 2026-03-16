import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import StarRating from '../../components/StarRating';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showCounter, setShowCounter] = useState(false);
  const [counterQuantity, setCounterQuantity] = useState('');
  const [counterPrice, setCounterPrice] = useState('');
  const [counterTerms, setCounterTerms] = useState('');

  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.getOrder(id!),
    enabled: !!id,
  });

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const acceptMutation = useMutation({
    mutationFn: () => api.acceptOrder(id!),
    onSuccess: invalidateOrder,
    onError: (e: any) => Alert.alert('', e.message || t('common.error')),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectOrder(id!),
    onSuccess: invalidateOrder,
    onError: (e: any) => Alert.alert('', e.message || t('common.error')),
  });

  const counterMutation = useMutation({
    mutationFn: (data: any) => api.counterOrder(id!, data),
    onSuccess: () => {
      setShowCounter(false);
      invalidateOrder();
    },
    onError: (e: any) => Alert.alert('', e.message || t('common.error')),
  });

  const payMutation = useMutation({
    mutationFn: () => api.payOrder(id!),
    onSuccess: invalidateOrder,
    onError: (e: any) => Alert.alert('', e.message || t('common.error')),
  });

  const shipMutation = useMutation({
    mutationFn: () => api.shipOrder(id!),
    onSuccess: invalidateOrder,
    onError: (e: any) => Alert.alert('', e.message || t('common.error')),
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.confirmDelivery(id!),
    onSuccess: invalidateOrder,
    onError: (e: any) => Alert.alert('', e.message || t('common.error')),
  });

  const disputeMutation = useMutation({
    mutationFn: (reason: string) => api.disputeOrder(id!, reason),
    onSuccess: () => {
      setShowDispute(false);
      invalidateOrder();
    },
    onError: (e: any) => Alert.alert('', e.message || t('common.error')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelOrder(id!),
    onSuccess: invalidateOrder,
    onError: (e: any) => Alert.alert('', e.message || t('common.error')),
  });

  const reviewMutation = useMutation({
    mutationFn: (data: any) => api.createReview(data),
    onSuccess: () => {
      setShowReview(false);
      invalidateOrder();
    },
    onError: (e: any) => Alert.alert('', e.message || t('common.error')),
  });

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
      </View>
    );
  }

  const isBuyer = user?.id === order.buyerId;
  const isSeller = user?.id === order.sellerId;
  const isReceivingParty =
    (order.status === 'proposed' && order.proposedTo === user?.id) ||
    (order.status === 'countered' && order.counteredTo === user?.id);

  const totalPrice =
    order.quantity && order.pricePerUnit
      ? Number(order.quantity) * Number(order.pricePerUnit)
      : null;

  const currencySymbol = order.currency === 'USD' ? '$' : '';
  const currencySuffix = order.currency === 'ETB' ? ' ETB' : '';

  const handleCounter = () => {
    const qty = parseFloat(counterQuantity);
    const price = parseFloat(counterPrice);
    if (!qty || qty <= 0) {
      Alert.alert('', `${t('order.quantity')} ${t('common.required')}`);
      return;
    }
    if (!price || price <= 0) {
      Alert.alert('', `${t('order.pricePerUnit')} ${t('common.required')}`);
      return;
    }
    counterMutation.mutate({
      quantity: qty,
      pricePerUnit: price,
      deliveryTerms: counterTerms.trim() || undefined,
    });
  };

  const handleDispute = () => {
    if (!disputeReason.trim()) {
      Alert.alert('', `${t('order.disputeReason')} ${t('common.required')}`);
      return;
    }
    disputeMutation.mutate(disputeReason.trim());
  };

  const handleReview = () => {
    if (reviewRating === 0) {
      Alert.alert('', t('order.ratingRequired'));
      return;
    }
    reviewMutation.mutate({
      orderId: id,
      rating: reviewRating,
      comment: reviewComment.trim() || undefined,
    });
  };

  const canCancel = ['proposed', 'countered', 'accepted'].includes(order.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.title}>{order.listing?.title || t('order.order')}</Text>
      {order.listing?.productCategory && (
        <View style={styles.productBadgeWrap}>
          <Text style={styles.productBadge}>{order.listing.productCategory}</Text>
        </View>
      )}

      {/* Info rows */}
      <View style={styles.infoCard}>
        <InfoRow label={t('order.buyer')} value={order.buyer?.name || '-'} />
        <InfoRow label={t('order.seller')} value={order.seller?.name || '-'} />
        <InfoRow
          label={t('order.quantity')}
          value={`${order.quantity || '-'} ${order.unit || ''}`}
        />
        <InfoRow
          label={t('order.pricePerUnit')}
          value={
            order.pricePerUnit
              ? `${currencySymbol}${Number(order.pricePerUnit).toLocaleString()}${currencySuffix}`
              : '-'
          }
        />
        <InfoRow
          label={t('order.totalPrice')}
          value={
            totalPrice
              ? `${currencySymbol}${totalPrice.toLocaleString()}${currencySuffix}`
              : '-'
          }
          highlight
        />
        {order.deliveryTerms && (
          <InfoRow label={t('order.deliveryTerms')} value={order.deliveryTerms} />
        )}
      </View>

      {/* Status section */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>{t('order.status')}</Text>
        <View style={styles.statusRow}>
          <OrderStatusBadge status={order.status} />
          {order.escrowStatus && (
            <Text style={styles.escrowText}>
              {t('order.escrow')}: {order.escrowStatus}
            </Text>
          )}
        </View>
      </View>

      {/* Timeline */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>{t('order.timeline')}</Text>
          {order.statusHistory.map((entry: any, index: number) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineDotCol}>
                <View style={styles.timelineDot} />
                {index < order.statusHistory.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStatus}>{entry.status}</Text>
                <Text style={styles.timelineDate}>
                  {new Date(entry.timestamp || entry.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionsSection}>
        {/* Receiving party can accept/reject/counter when proposed or countered */}
        {isReceivingParty &&
          ['proposed', 'countered'].includes(order.status) && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>{t('order.accept')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending}
              >
                <Ionicons name="close-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>{t('order.reject')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.counterBtn]}
                onPress={() => {
                  setCounterQuantity(String(order.quantity || ''));
                  setCounterPrice(String(order.pricePerUnit || ''));
                  setCounterTerms(order.deliveryTerms || '');
                  setShowCounter(true);
                }}
              >
                <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>{t('order.counter')}</Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Buyer deposits payment */}
        {isBuyer && order.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.actionBtnFull, styles.payBtn]}
            onPress={() => payMutation.mutate()}
            disabled={payMutation.isPending}
          >
            <Ionicons name="wallet-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>
              {payMutation.isPending
                ? t('common.loading')
                : t('order.depositPayment')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Seller marks as shipped */}
        {isSeller && order.status === 'payment_held' && (
          <TouchableOpacity
            style={[styles.actionBtnFull, styles.shipBtn]}
            onPress={() => shipMutation.mutate()}
            disabled={shipMutation.isPending}
          >
            <Ionicons name="airplane-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>
              {shipMutation.isPending
                ? t('common.loading')
                : t('order.markShipped')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Buyer confirms delivery or opens dispute */}
        {isBuyer && order.status === 'shipped' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>{t('order.confirmDelivery')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => setShowDispute(true)}
            >
              <Ionicons name="warning-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>{t('order.openDispute')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Leave review when completed */}
        {order.status === 'completed' && !order.hasReviewed && (
          <TouchableOpacity
            style={[styles.actionBtnFull, styles.reviewBtn]}
            onPress={() => setShowReview(true)}
          >
            <Ionicons name="star-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>{t('order.leaveReview')}</Text>
          </TouchableOpacity>
        )}

        {/* Cancel button */}
        {canCancel && (
          <TouchableOpacity
            style={[styles.actionBtnFull, styles.cancelBtn]}
            onPress={() =>
              Alert.alert(t('order.cancelOrder'), t('order.cancelConfirm'), [
                { text: t('common.no'), style: 'cancel' },
                {
                  text: t('common.yes'),
                  style: 'destructive',
                  onPress: () => cancelMutation.mutate(),
                },
              ])
            }
            disabled={cancelMutation.isPending}
          >
            <Ionicons name="ban-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>
              {cancelMutation.isPending
                ? t('common.loading')
                : t('order.cancelOrder')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Counter offer modal */}
      <Modal visible={showCounter} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('order.counterOffer')}</Text>

            <Text style={styles.modalLabel}>{t('order.quantity')} *</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={counterQuantity}
              onChangeText={setCounterQuantity}
              placeholder="0"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>{t('order.pricePerUnit')} *</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={counterPrice}
              onChangeText={setCounterPrice}
              placeholder="0"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>{t('order.deliveryTerms')}</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              multiline
              numberOfLines={3}
              value={counterTerms}
              onChangeText={setCounterTerms}
              placeholder={t('order.deliveryTermsHint')}
              placeholderTextColor="#999"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCounter(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  counterMutation.isPending && styles.submitDisabled,
                ]}
                onPress={handleCounter}
                disabled={counterMutation.isPending}
              >
                <Text style={styles.modalSubmitText}>
                  {counterMutation.isPending
                    ? t('common.loading')
                    : t('order.submitCounter')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dispute modal */}
      <Modal visible={showDispute} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('order.openDispute')}</Text>

            <Text style={styles.modalLabel}>{t('order.disputeReason')} *</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              multiline
              numberOfLines={4}
              value={disputeReason}
              onChangeText={setDisputeReason}
              placeholder={t('order.disputeReasonHint')}
              placeholderTextColor="#999"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDispute(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: '#F44336' },
                  disputeMutation.isPending && styles.submitDisabled,
                ]}
                onPress={handleDispute}
                disabled={disputeMutation.isPending}
              >
                <Text style={styles.modalSubmitText}>
                  {disputeMutation.isPending
                    ? t('common.loading')
                    : t('order.submitDispute')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review modal */}
      <Modal visible={showReview} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('order.leaveReview')}</Text>

            <Text style={styles.modalLabel}>{t('order.rating')} *</Text>
            <View style={styles.ratingRow}>
              <StarRating
                rating={reviewRating}
                editable
                onChange={setReviewRating}
                size={32}
              />
            </View>

            <Text style={styles.modalLabel}>{t('order.comment')}</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              multiline
              numberOfLines={3}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder={t('order.commentHint')}
              placeholderTextColor="#999"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowReview(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  reviewMutation.isPending && styles.submitDisabled,
                ]}
                onPress={handleReview}
                disabled={reviewMutation.isPending}
              >
                <Text style={styles.modalSubmitText}>
                  {reviewMutation.isPending
                    ? t('common.loading')
                    : t('order.submitReview')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  productBadgeWrap: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  infoCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },
  infoValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  statusSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  escrowText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  timelineSection: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 48,
  },
  timelineDotCol: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E7D32',
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 16,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  timelineDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionsSection: {
    gap: 12,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  acceptBtn: {
    backgroundColor: '#2E7D32',
  },
  rejectBtn: {
    backgroundColor: '#F44336',
  },
  counterBtn: {
    backgroundColor: '#FF9800',
  },
  payBtn: {
    backgroundColor: '#FF9800',
  },
  shipBtn: {
    backgroundColor: '#9C27B0',
  },
  reviewBtn: {
    backgroundColor: '#2E7D32',
  },
  cancelBtn: {
    backgroundColor: '#9E9E9E',
  },
  submitDisabled: {
    opacity: 0.6,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#FAFAFA',
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  ratingRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
