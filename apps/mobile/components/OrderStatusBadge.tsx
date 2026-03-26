import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface OrderStatusBadgeProps {
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  proposed: '#2196F3',
  countered: '#FF9800',
  accepted: '#4CAF50',
  rejected: '#F44336',
  payment_pending: '#FF9800',
  payment_held: '#FF9800',
  shipped: '#9C27B0',
  delivered: '#4CAF50',
  completed: '#1B4332',
  cancelled: '#9E9E9E',
  disputed: '#F44336',
};

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  proposed: 'order.statusProposed',
  countered: 'order.statusCountered',
  accepted: 'order.statusAccepted',
  rejected: 'order.statusRejected',
  payment_pending: 'order.statusPaymentPending',
  payment_held: 'order.statusPaymentHeld',
  shipped: 'order.statusShipped',
  delivered: 'order.statusDelivered',
  completed: 'order.statusCompleted',
  cancelled: 'order.statusCancelled',
  disputed: 'order.statusDisputed',
};

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const { t } = useTranslation();

  const color = STATUS_COLORS[status] || '#9E9E9E';
  const translationKey = STATUS_TRANSLATION_KEYS[status];
  const label = translationKey ? t(translationKey) : status;

  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
