import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import OrderStatusBadge from './OrderStatusBadge';

interface OrderCardProps {
  order: any;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OrderCard({ order }: OrderCardProps) {
  const router = useRouter();

  const counterparty = order.buyer?.name || order.seller?.name || '';
  const title = order.listing?.title || '';
  const quantity = order.quantity;
  const unit = order.unit || order.listing?.unit;
  const price = order.totalPrice ?? order.price;
  const currency = order.currency || order.listing?.currency || 'ETB';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/order/${order.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <OrderStatusBadge status={order.status} />
      </View>

      {counterparty ? (
        <Text style={styles.counterparty}>{counterparty}</Text>
      ) : null}

      <View style={styles.details}>
        {quantity && unit && (
          <Text style={styles.detail}>{quantity} {unit}</Text>
        )}
        {price != null && (
          <Text style={styles.price}>
            {currency === 'USD' ? '$' : ''}{Number(price).toLocaleString()} {currency === 'ETB' ? 'ETB' : ''}
          </Text>
        )}
      </View>

      {order.createdAt && (
        <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  counterparty: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  detail: {
    fontSize: 13,
    color: '#555',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B4332',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
});
