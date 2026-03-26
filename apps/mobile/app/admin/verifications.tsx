import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, TextInput, Modal, ScrollView,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../lib/api';

type StatusFilter = 'pending' | 'approved' | 'rejected';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ReviewModal({
  item, onClose, onSubmit,
}: {
  item: any;
  onClose: () => void;
  onSubmit: (status: 'approved' | 'rejected', note: string) => void;
}) {
  const [note, setNote] = useState('');

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>Review Verification</Text>

          <View style={modal.info}>
            <Text style={modal.name}>{item.userName || '—'}</Text>
            {item.userPhone && <Text style={modal.phone}>{item.userPhone}</Text>}
            {item.businessName && (
              <View style={modal.row}>
                <Ionicons name="business-outline" size={14} color="#6B7280" />
                <Text style={modal.rowText}>{item.businessName}</Text>
              </View>
            )}
            {item.businessType && (
              <View style={modal.row}>
                <Ionicons name="briefcase-outline" size={14} color="#6B7280" />
                <Text style={modal.rowText}>{item.businessType}</Text>
              </View>
            )}
            {item.tradeLicenseRef && (
              <View style={modal.row}>
                <Ionicons name="document-text-outline" size={14} color="#6B7280" />
                <Text style={modal.rowText}>License: {item.tradeLicenseRef}</Text>
              </View>
            )}
            <View style={modal.row}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={modal.rowText}>Submitted {formatDate(item.createdAt)}</Text>
            </View>
          </View>

          <Text style={modal.noteLabel}>Review Note (optional)</Text>
          <TextInput
            style={modal.noteInput}
            placeholder="Add a note for the applicant…"
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />

          <View style={modal.btns}>
            <TouchableOpacity style={modal.rejectBtn} onPress={() => onSubmit('rejected', note)}>
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text style={modal.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.approveBtn} onPress={() => onSubmit('approved', note)}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={modal.approveText}>Approve</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
            <Text style={modal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  handle:  { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:   { fontSize: 18, fontWeight: '800', color: '#1A1D21', marginBottom: 16 },
  info:    { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, gap: 10, marginBottom: 16 },
  name:    { fontSize: 16, fontWeight: '700', color: '#1A1D21' },
  phone:   { fontSize: 13, color: '#1B4332', fontWeight: '600' },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 13, color: '#6B7280' },
  noteLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  noteInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A1D21',
    minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
  },
  btns: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#DC2626',
  },
  rejectText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#1B4332',
  },
  approveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 14, color: '#6B7280' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminVerifications() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [reviewing, setReviewing] = useState<any | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'verifications', statusFilter],
    queryFn: () => adminApi.getVerifications(statusFilter),
    staleTime: 20_000,
  });

  const items = data?.data ?? [];

  const handleSubmitReview = async (status: 'approved' | 'rejected', note: string) => {
    if (!reviewing) return;
    setSubmittingId(reviewing.id);
    setReviewing(null);
    try {
      await adminApi.reviewVerification(reviewing.id, status, note || undefined);
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update verification');
    } finally {
      setSubmittingId(null);
    }
  };

  const statusColor = (s: string) =>
    s === 'approved' ? '#1B4332' : s === 'rejected' ? '#DC2626' : '#D97706';
  const statusBg = (s: string) =>
    s === 'approved' ? '#ECFDF5' : s === 'rejected' ? '#FEF2F2' : '#FFFBEB';

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.tabs}>
        {(['pending', 'approved', 'rejected'] as StatusFilter[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.tab, statusFilter === s && styles.tabActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.tabText, statusFilter === s && styles.tabTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.count}>{items.length} verification{items.length !== 1 ? 's' : ''}</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1B4332" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={56} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>
                {statusFilter === 'pending' ? 'No pending verifications' : `No ${statusFilter} verifications`}
              </Text>
              {statusFilter === 'pending' && (
                <Text style={styles.emptySubtitle}>All applications have been reviewed</Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.userName || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.userName || '—'}</Text>
                  {item.userPhone && <Text style={styles.cardPhone}>{item.userPhone}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBg(item.verificationStatus) }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.verificationStatus) }]}>
                    {item.verificationStatus.toUpperCase()}
                  </Text>
                </View>
              </View>

              {item.businessName && (
                <View style={styles.detail}>
                  <Ionicons name="business-outline" size={14} color="#6B7280" />
                  <Text style={styles.detailText}>{item.businessName}</Text>
                </View>
              )}
              {item.businessType && (
                <View style={styles.detail}>
                  <Ionicons name="briefcase-outline" size={14} color="#6B7280" />
                  <Text style={styles.detailText}>{item.businessType}</Text>
                </View>
              )}
              {item.tradeLicenseRef && (
                <View style={styles.detail}>
                  <Ionicons name="document-text-outline" size={14} color="#6B7280" />
                  <Text style={styles.detailText}>License: {item.tradeLicenseRef}</Text>
                </View>
              )}
              {item.reviewNote && (
                <View style={styles.noteBox}>
                  <Ionicons name="chatbubble-outline" size={13} color="#6B7280" />
                  <Text style={styles.noteText}>{item.reviewNote}</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  Submitted {formatDate(item.createdAt)}
                  {item.reviewedAt ? `  ·  Reviewed ${formatDate(item.reviewedAt)}` : ''}
                </Text>

                {item.verificationStatus === 'pending' && (
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => setReviewing(item)}
                    disabled={submittingId === item.id}
                  >
                    {submittingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="clipboard-outline" size={14} color="#fff" />
                        <Text style={styles.reviewBtnText}>Review</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {reviewing && (
        <ReviewModal
          item={reviewing}
          onClose={() => setReviewing(null)}
          onSubmit={handleSubmitReview}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  tabActive: { backgroundColor: '#1B4332' },
  tabText:       { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },

  count: { fontSize: 11, color: '#9CA3AF', paddingHorizontal: 16, marginBottom: 4 },
  list: { paddingHorizontal: 12, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1A1D21', alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { color: '#fff', fontWeight: '800', fontSize: 17 },
  cardName:    { fontSize: 15, fontWeight: '700', color: '#1A1D21' },
  cardPhone:   { fontSize: 12, color: '#1B4332', fontWeight: '600', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  detail: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailText: { fontSize: 13, color: '#6B7280' },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F3F4F6', borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 4,
  },
  noteText: { fontSize: 12, color: '#6B7280', flex: 1, fontStyle: 'italic' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  dateText: { fontSize: 11, color: '#9CA3AF' },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1B4332', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  reviewBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF' },
});
