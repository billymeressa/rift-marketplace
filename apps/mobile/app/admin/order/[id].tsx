import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, FlatList, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../../lib/api';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-ET', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function statusColor(s: string) {
  switch (s) {
    case 'completed':    return '#059669';
    case 'disputed':     return '#DC2626';
    case 'shipped':      return '#1E40AF';
    case 'payment_held': return '#D97706';
    case 'proposed':     return '#6B7280';
    case 'cancelled':    return '#9CA3AF';
    default:             return '#6B7280';
  }
}

function statusBg(s: string) {
  switch (s) {
    case 'completed':    return '#ECFDF5';
    case 'disputed':     return '#FEF2F2';
    case 'shipped':      return '#EFF6FF';
    case 'payment_held': return '#FFFBEB';
    default:             return '#F3F4F6';
  }
}

function inspectionColor(s: string | null) {
  if (!s) return '#9CA3AF';
  if (s === 'passed') return '#059669';
  if (s === 'failed') return '#DC2626';
  return '#D97706';
}

// ─── Assign Inspector Sheet ───────────────────────────────────────────────────

function AssignInspectorModal({
  orderId, onClose,
}: { orderId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'inspectors'],
    queryFn: adminApi.getInspectors,
    staleTime: 60_000,
  });
  const inspectors = data?.data ?? [];

  const mutation = useMutation({
    mutationFn: (inspectorId: string) => adminApi.assignInspector(orderId, inspectorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      onClose();
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed to assign inspector'),
  });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>Assign Inspector</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#1B4332" style={{ marginVertical: 30 }} />
          ) : inspectors.length === 0 ? (
            <View style={modal.empty}>
              <Ionicons name="person-outline" size={40} color="#E5E7EB" />
              <Text style={modal.emptyText}>No inspectors found</Text>
              <Text style={modal.emptySubText}>Create users with role='inspector' first</Text>
            </View>
          ) : (
            <FlatList
              data={inspectors}
              keyExtractor={i => i.id}
              style={{ maxHeight: 350 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modal.listItem}
                  onPress={() => mutation.mutate(item.id)}
                  disabled={mutation.isPending}
                >
                  <View style={modal.listAvatar}>
                    <Text style={modal.listAvatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modal.listName}>{item.name || '—'}</Text>
                    {item.phone && <Text style={modal.listSub}>{item.phone}</Text>}
                  </View>
                  {mutation.isPending
                    ? <ActivityIndicator size="small" color="#1B4332" />
                    : <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  }
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
            <Text style={modal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Assign Truck Sheet ────────────────────────────────────────────────────────

function AssignTruckModal({
  orderId, onClose,
}: { orderId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedTruck, setSelectedTruck] = useState<any | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

  const trucksQ = useQuery({ queryKey: ['admin', 'trucks'],  queryFn: adminApi.getTrucks,  staleTime: 60_000 });
  const driversQ = useQuery({ queryKey: ['admin', 'drivers'], queryFn: adminApi.getDrivers, staleTime: 60_000 });

  const trucks  = (trucksQ.data?.data  ?? []).filter((t: any) => t.status === 'active');
  const drivers = (driversQ.data?.data ?? []).filter((d: any) => d.status === 'active');

  const mutation = useMutation({
    mutationFn: () => adminApi.assignTruck(orderId, selectedTruck!.id, selectedDriver!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      onClose();
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed to assign truck'),
  });

  const isLoading = trucksQ.isLoading || driversQ.isLoading;
  const canAssign = selectedTruck && selectedDriver;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>Assign Truck & Driver</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#1B4332" style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Truck picker */}
              <Text style={modal.sectionLabel}>SELECT TRUCK</Text>
              {trucks.length === 0 ? (
                <Text style={modal.emptySubText}>No active trucks available</Text>
              ) : (
                trucks.map((t: any) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[modal.listItem, selectedTruck?.id === t.id && modal.listItemSelected]}
                    onPress={() => setSelectedTruck(t)}
                  >
                    <View style={[modal.listAvatar, { backgroundColor: '#1E40AF1A' }]}>
                      <Ionicons name="car-sport-outline" size={18} color="#1E40AF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={modal.listName}>{t.plateNumber}</Text>
                      {(t.make || t.model) && (
                        <Text style={modal.listSub}>{[t.make, t.model].filter(Boolean).join(' ')}</Text>
                      )}
                    </View>
                    {selectedTruck?.id === t.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#1B4332" />
                    )}
                  </TouchableOpacity>
                ))
              )}

              {/* Driver picker */}
              <Text style={[modal.sectionLabel, { marginTop: 16 }]}>SELECT DRIVER</Text>
              {drivers.length === 0 ? (
                <Text style={modal.emptySubText}>No active drivers available</Text>
              ) : (
                drivers.map((d: any) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[modal.listItem, selectedDriver?.id === d.id && modal.listItemSelected]}
                    onPress={() => setSelectedDriver(d)}
                  >
                    <View style={modal.listAvatar}>
                      <Text style={modal.listAvatarText}>{(d.name || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={modal.listName}>{d.name}</Text>
                      {d.phone && <Text style={modal.listSub}>{d.phone}</Text>}
                    </View>
                    {selectedDriver?.id === d.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#1B4332" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[modal.confirmBtn, !canAssign && modal.confirmBtnDisabled]}
            onPress={() => mutation.mutate()}
            disabled={!canAssign || mutation.isPending}
          >
            {mutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={modal.confirmText}>Assign Truck & Driver</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
            <Text style={modal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Chain of Custody Step ────────────────────────────────────────────────────

function TimelineStep({
  icon, title, subtitle, date, done, active,
}: {
  icon: any; title: string; subtitle?: string; date?: string; done: boolean; active: boolean;
}) {
  return (
    <View style={tl.step}>
      <View style={tl.lineCol}>
        <View style={[tl.dot, done && tl.dotDone, active && tl.dotActive]}>
          <Ionicons
            name={done ? 'checkmark' : active ? icon : icon}
            size={14}
            color={done ? '#fff' : active ? '#1B4332' : '#9CA3AF'}
          />
        </View>
        <View style={tl.line} />
      </View>
      <View style={tl.content}>
        <Text style={[tl.title, !done && !active && tl.titleMuted]}>{title}</Text>
        {subtitle && <Text style={tl.sub}>{subtitle}</Text>}
        {date && <Text style={tl.date}>{date}</Text>}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showAssignInspector, setShowAssignInspector] = useState(false);
  const [showAssignTruck, setShowAssignTruck]         = useState(false);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => adminApi.getOrder(id!),
    enabled: !!id,
    staleTime: 15_000,
  });

  const releaseMutation = useMutation({
    mutationFn: () => adminApi.releaseEscrow(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'order', id] }),
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed'),
  });

  const refundMutation = useMutation({
    mutationFn: () => adminApi.refundEscrow(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'order', id] }),
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed'),
  });

  const autoReleaseMutation = useMutation({
    mutationFn: adminApi.runAutoRelease,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', id] });
      Alert.alert('Done', `Released ${data.released} order(s)`);
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed'),
  });

  const confirmRelease = () => {
    const msg = 'Release escrow to seller? This marks the order as completed.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) releaseMutation.mutate();
      return;
    }
    Alert.alert('Release Escrow', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Release to Seller', style: 'default', onPress: () => releaseMutation.mutate() },
    ]);
  };

  const confirmRefund = () => {
    const msg = 'Refund escrow to buyer? This cancels the order.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) refundMutation.mutate();
      return;
    }
    Alert.alert('Refund to Buyer', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Refund to Buyer', style: 'destructive', onPress: () => refundMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Ionicons name="receipt-outline" size={48} color="#E5E7EB" />
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );
  }

  // Countdown to auto-release
  let autoReleaseLabel: string | null = null;
  if (order.escrowAutoReleaseAt && order.status === 'shipped') {
    const msLeft = new Date(order.escrowAutoReleaseAt).getTime() - Date.now();
    if (msLeft > 0) {
      const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
      autoReleaseLabel = `Auto-releases in ~${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`;
    } else {
      autoReleaseLabel = 'Auto-release overdue — run check';
    }
  }

  const needsInspector  = order.status === 'payment_held' && !order.inspectorId;
  const needsTruck      = order.inspectionStatus === 'passed' && !order.assignedTruckId;
  const isDisputed      = order.status === 'disputed';
  const isShipped       = order.status === 'shipped';
  const statusHistory   = Array.isArray(order.statusHistory) ? order.statusHistory : [];

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Section 1: Order Overview ───────────────────────────────────── */}
        <Text style={styles.sectionTitle}>ORDER OVERVIEW</Text>
        <View style={styles.card}>
          <Text style={styles.orderIdHeader}>#{order.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.listingTitle}>{order.listing?.title ?? '—'}</Text>
          <Text style={styles.category}>{order.listing?.productCategory ?? ''}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Quantity</Text>
              <Text style={styles.infoValue}>{Number(order.quantity).toLocaleString()} {order.unit}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Price / Unit</Text>
              <Text style={styles.infoValue}>{Number(order.pricePerUnit).toLocaleString()} {order.currency}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total Price</Text>
              <Text style={[styles.infoValue, { color: '#1B4332', fontWeight: '800' }]}>
                {Number(order.totalPrice).toLocaleString()} {order.currency}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
            </View>
          </View>

          {order.deliveryTerms && (
            <View style={styles.deliveryTerms}>
              <Ionicons name="document-text-outline" size={13} color="#6B7280" />
              <Text style={styles.deliveryTermsText}>{order.deliveryTerms}</Text>
            </View>
          )}

          {/* Buyer / Seller */}
          <View style={styles.partiesRow}>
            <View style={styles.partyBox}>
              <Text style={styles.partyRole}>BUYER</Text>
              <Text style={styles.partyName}>{order.buyer?.name ?? '—'}</Text>
              {order.buyer?.phone && <Text style={styles.partyPhone}>{order.buyer.phone}</Text>}
            </View>
            <View style={styles.partyArrow}>
              <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />
            </View>
            <View style={styles.partyBox}>
              <Text style={styles.partyRole}>SELLER</Text>
              <Text style={styles.partyName}>{order.seller?.name ?? '—'}</Text>
              {order.seller?.phone && <Text style={styles.partyPhone}>{order.seller.phone}</Text>}
            </View>
          </View>

          {/* Status badges */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: statusBg(order.status) }]}>
              <Text style={[styles.badgeText, { color: statusColor(order.status) }]}>
                {order.status.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
            {order.escrowStatus !== 'none' && (
              <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
                <Text style={[styles.badgeText, { color: '#374151' }]}>
                  ESCROW: {order.escrowStatus.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Section 2: Chain of Custody Timeline ─────────────────────────── */}
        <Text style={styles.sectionTitle}>CHAIN OF CUSTODY</Text>
        <View style={styles.card}>
          {/* Step 1: Payment held */}
          <TimelineStep
            icon="card-outline"
            title="Payment Held"
            date={order.status !== 'proposed' && order.status !== 'accepted' ? formatDate(order.createdAt) : undefined}
            done={['payment_held', 'shipped', 'completed', 'disputed'].includes(order.status)}
            active={order.status === 'accepted'}
          />

          {/* Step 2: Inspector assigned */}
          <TimelineStep
            icon="person-circle-outline"
            title="Inspector Assigned"
            subtitle={order.inspector ? order.inspector.name : (needsInspector ? 'Not assigned' : undefined)}
            done={!!order.inspectorId}
            active={order.status === 'payment_held' && !order.inspectorId}
          />

          {/* Step 3: Inspection result */}
          <TimelineStep
            icon="clipboard-outline"
            title={`Inspection: ${order.inspectionStatus ?? 'Pending'}`}
            subtitle={order.inspectionNotes ?? undefined}
            date={order.inspectionCompletedAt ? formatDate(order.inspectionCompletedAt) : undefined}
            done={order.inspectionStatus === 'passed'}
            active={order.inspectionStatus === 'pending'}
          />

          {/* Step 4: Truck assigned */}
          <TimelineStep
            icon="car-sport-outline"
            title="Truck Assigned"
            subtitle={order.truck
              ? `${order.truck.plateNumber}${order.driver ? ' — ' + order.driver.name : ''}`
              : (needsTruck ? 'Not assigned' : undefined)
            }
            done={!!order.assignedTruckId}
            active={order.inspectionStatus === 'passed' && !order.assignedTruckId}
          />

          {/* Step 5: Picked up */}
          <TimelineStep
            icon="cube-outline"
            title="Picked Up"
            subtitle={order.pickupPhotos?.length > 0 ? `${order.pickupPhotos.length} photo(s)` : undefined}
            date={order.pickupConfirmedAt ? formatDate(order.pickupConfirmedAt) : undefined}
            done={['shipped', 'completed', 'disputed'].includes(order.status)}
            active={order.status === 'payment_held' && !!order.assignedTruckId}
          />

          {/* Step 6: Delivered */}
          <TimelineStep
            icon="checkmark-done-outline"
            title="Delivered"
            subtitle={order.sealIntact
              ? `Seal intact: ${order.sealIntact}`
              : (order.status === 'shipped' ? 'Awaiting buyer confirmation' : undefined)
            }
            done={order.status === 'completed'}
            active={order.status === 'shipped'}
          />
        </View>

        {/* ── Section 3: Admin Actions ──────────────────────────────────────── */}
        {(needsInspector || needsTruck || isDisputed || isShipped) && (
          <>
            <Text style={styles.sectionTitle}>ADMIN ACTIONS</Text>
            <View style={styles.card}>

              {needsInspector && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setShowAssignInspector(true)}
                >
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Assign Inspector</Text>
                </TouchableOpacity>
              )}

              {needsTruck && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#1E40AF' }]}
                  onPress={() => setShowAssignTruck(true)}
                >
                  <Ionicons name="car-sport-outline" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Assign Truck & Driver</Text>
                </TouchableOpacity>
              )}

              {isDisputed && (
                <View style={styles.disputeActions}>
                  <Text style={styles.disputeLabel}>
                    This order is in dispute. Choose a resolution:
                  </Text>
                  <View style={styles.disputeBtns}>
                    <TouchableOpacity
                      style={styles.releaseBtn}
                      onPress={confirmRelease}
                      disabled={releaseMutation.isPending}
                    >
                      {releaseMutation.isPending
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                            <Text style={styles.releaseBtnText}>Release to Seller</Text>
                          </>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.refundBtn}
                      onPress={confirmRefund}
                      disabled={refundMutation.isPending}
                    >
                      {refundMutation.isPending
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Ionicons name="return-down-back-outline" size={16} color="#fff" />
                            <Text style={styles.refundBtnText}>Refund to Buyer</Text>
                          </>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {isShipped && (
                <View style={styles.autoReleaseBox}>
                  {autoReleaseLabel && (
                    <View style={styles.autoReleaseInfo}>
                      <Ionicons name="time-outline" size={16} color="#D97706" />
                      <Text style={styles.autoReleaseText}>{autoReleaseLabel}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.autoReleaseBtn}
                    onPress={() => autoReleaseMutation.mutate()}
                    disabled={autoReleaseMutation.isPending}
                  >
                    {autoReleaseMutation.isPending
                      ? <ActivityIndicator size="small" color="#D97706" />
                      : <Text style={styles.autoReleaseBtnText}>Run Auto-Release Check</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Section 4: Status History ─────────────────────────────────────── */}
        {statusHistory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>STATUS HISTORY</Text>
            <View style={styles.card}>
              {[...statusHistory].reverse().map((entry: any, i: number) => (
                <View
                  key={i}
                  style={[styles.historyRow, i < statusHistory.length - 1 && styles.historyRowBorder]}
                >
                  <View style={styles.historyDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyStatus}>
                      {entry.status?.replace(/_/g, ' ').toUpperCase() ?? '—'}
                    </Text>
                    {entry.note && <Text style={styles.historyNote}>{entry.note}</Text>}
                    <Text style={styles.historyDate}>{formatDateTime(entry.timestamp)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {showAssignInspector && (
        <AssignInspectorModal
          orderId={id!}
          onClose={() => setShowAssignInspector(false)}
        />
      )}

      {showAssignTruck && (
        <AssignTruckModal
          orderId={id!}
          onClose={() => setShowAssignTruck(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F9FAFB' },
  content:    { padding: 16, paddingBottom: 60 },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:  { fontSize: 15, color: '#9CA3AF' },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 20,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  orderIdHeader:  { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 4 },
  listingTitle:   { fontSize: 18, fontWeight: '800', color: '#111827' },
  category:       { fontSize: 12, color: '#6B7280', marginBottom: 14 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  infoItem: { minWidth: '45%', flex: 1 },
  infoLabel:{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:{ fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 },

  deliveryTerms: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginBottom: 14,
  },
  deliveryTermsText: { fontSize: 12, color: '#6B7280', flex: 1 },

  partiesRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 8, marginBottom: 14,
  },
  partyBox:   { flex: 1 },
  partyArrow: { alignItems: 'center' },
  partyRole:  { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase' },
  partyName:  { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 },
  partyPhone: { fontSize: 11, color: '#1B4332', fontWeight: '600', marginTop: 1 },

  badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Action buttons
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1B4332', borderRadius: 12,
    paddingVertical: 14, marginBottom: 10,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  disputeActions: { gap: 10 },
  disputeLabel:   { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  disputeBtns:    { flexDirection: 'row', gap: 10 },
  releaseBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14,
  },
  refundBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 14,
  },
  releaseBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  refundBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },

  autoReleaseBox:  { gap: 10 },
  autoReleaseInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12,
  },
  autoReleaseText:   { fontSize: 13, color: '#D97706', fontWeight: '600' },
  autoReleaseBtn:    {
    alignItems: 'center', paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#D97706', borderRadius: 12,
  },
  autoReleaseBtnText:{ fontSize: 13, fontWeight: '700', color: '#D97706' },

  // Status history
  historyRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  historyDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1B4332', marginTop: 5 },
  historyStatus:    { fontSize: 12, fontWeight: '700', color: '#111827' },
  historyNote:      { fontSize: 12, color: '#6B7280', marginTop: 2 },
  historyDate:      { fontSize: 10, color: '#9CA3AF', marginTop: 3 },
});

// Timeline styles
const tl = StyleSheet.create({
  step: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  lineCol: { alignItems: 'center', width: 28 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone:   { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  dotActive: { backgroundColor: '#D1FAE5', borderColor: '#1B4332' },
  line: { flex: 1, width: 1.5, backgroundColor: '#E5E7EB', marginVertical: 2 },
  content:    { flex: 1, paddingBottom: 14 },
  title:      { fontSize: 14, fontWeight: '700', color: '#111827' },
  titleMuted: { color: '#9CA3AF' },
  sub:        { fontSize: 12, color: '#6B7280', marginTop: 2 },
  date:       { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});

// Modal styles
const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40,
  },
  handle:  { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:   { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },

  empty:       { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText:   { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySubText:{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 8 },

  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  listItemSelected: { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 8 },
  listAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1B4332', alignItems: 'center', justifyContent: 'center',
  },
  listAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  listName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  listSub:  { fontSize: 12, color: '#6B7280', marginTop: 1 },

  confirmBtn: {
    backgroundColor: '#1B4332', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  confirmBtnDisabled: { backgroundColor: '#9CA3AF' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn:   { alignItems: 'center', paddingVertical: 12 },
  cancelText:  { fontSize: 14, color: '#6B7280' },
});
