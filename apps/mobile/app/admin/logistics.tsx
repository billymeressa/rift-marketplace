import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput, ScrollView,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'trucks' | 'drivers';

// ─── Status badges ─────────────────────────────────────────────────────────────

function truckStatusColor(s: string) {
  return s === 'active' ? '#059669' : '#6B7280';
}
function truckStatusBg(s: string) {
  return s === 'active' ? '#ECFDF5' : '#F3F4F6';
}
function driverStatusColor(s: string) {
  if (s === 'active')    return '#059669';
  if (s === 'suspended') return '#DC2626';
  return '#6B7280';
}
function driverStatusBg(s: string) {
  if (s === 'active')    return '#ECFDF5';
  if (s === 'suspended') return '#FEF2F2';
  return '#F3F4F6';
}

// ─── Add Truck Modal ───────────────────────────────────────────────────────────

function AddTruckModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [plate, setPlate]    = useState('');
  const [make, setMake]      = useState('');
  const [model, setModel]    = useState('');
  const [capacity, setCapacity] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.addTruck({
      plateNumber: plate.trim(),
      make: make.trim() || undefined,
      model: model.trim() || undefined,
      capacityKg: capacity ? Number(capacity) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trucks'] });
      onClose();
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed to add truck'),
  });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Add Truck</Text>

            <Text style={modal.label}>Plate Number <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <TextInput
              style={modal.input}
              placeholder="e.g. ET-000-AA"
              placeholderTextColor="#9CA3AF"
              value={plate}
              onChangeText={setPlate}
              autoCapitalize="characters"
            />

            <Text style={modal.label}>Make</Text>
            <TextInput
              style={modal.input}
              placeholder="e.g. Isuzu"
              placeholderTextColor="#9CA3AF"
              value={make}
              onChangeText={setMake}
            />

            <Text style={modal.label}>Model</Text>
            <TextInput
              style={modal.input}
              placeholder="e.g. NQR"
              placeholderTextColor="#9CA3AF"
              value={model}
              onChangeText={setModel}
            />

            <Text style={modal.label}>Capacity (kg)</Text>
            <TextInput
              style={modal.input}
              placeholder="e.g. 8000"
              placeholderTextColor="#9CA3AF"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[modal.confirmBtn, !plate.trim() && modal.confirmBtnDisabled]}
              onPress={() => mutation.mutate()}
              disabled={!plate.trim() || mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={modal.confirmText}>Add Truck</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Driver Modal ──────────────────────────────────────────────────────────

function AddDriverModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [license, setLicense] = useState('');
  const [truckId, setTruckId] = useState('');

  const trucksQ = useQuery({
    queryKey: ['admin', 'trucks'],
    queryFn: adminApi.getTrucks,
    staleTime: 60_000,
  });
  const trucks = (trucksQ.data?.data ?? []).filter((t: any) => t.status === 'active');

  const mutation = useMutation({
    mutationFn: () => adminApi.addDriver({
      name: name.trim(),
      phone: phone.trim(),
      licenseNumber: license.trim() || undefined,
      truckId: truckId || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      onClose();
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed to add driver'),
  });

  const canSubmit = name.trim() && phone.trim();

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Add Driver</Text>

            <Text style={modal.label}>Name <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <TextInput
              style={modal.input}
              placeholder="Driver full name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />

            <Text style={modal.label}>Phone <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <TextInput
              style={modal.input}
              placeholder="+251 9XX XXX XXX"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={modal.label}>License Number</Text>
            <TextInput
              style={modal.input}
              placeholder="Optional"
              placeholderTextColor="#9CA3AF"
              value={license}
              onChangeText={setLicense}
            />

            {/* Truck picker */}
            <Text style={modal.label}>Assign Truck (optional)</Text>
            <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[modal.truckOption, !truckId && modal.truckOptionSelected]}
                onPress={() => setTruckId('')}
              >
                <Text style={[modal.truckOptionText, !truckId && { color: '#1B4332', fontWeight: '700' }]}>
                  None
                </Text>
              </TouchableOpacity>
              {trucks.map((t: any) => (
                <TouchableOpacity
                  key={t.id}
                  style={[modal.truckOption, truckId === t.id && modal.truckOptionSelected]}
                  onPress={() => setTruckId(t.id)}
                >
                  <Text style={[modal.truckOptionText, truckId === t.id && { color: '#1B4332', fontWeight: '700' }]}>
                    {t.plateNumber}{t.make ? ` (${t.make})` : ''}
                  </Text>
                  {truckId === t.id && <Ionicons name="checkmark" size={16} color="#1B4332" />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[modal.confirmBtn, !canSubmit && modal.confirmBtnDisabled, { marginTop: 16 }]}
              onPress={() => mutation.mutate()}
              disabled={!canSubmit || mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={modal.confirmText}>Add Driver</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Status Picker Modal ───────────────────────────────────────────────────────

function StatusPickerModal<T extends string>({
  title, value, options, onSelect, onClose,
}: {
  title: string;
  value: T;
  options: { value: T; label: string; color: string }[];
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>{title}</Text>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[modal.statusOption, value === opt.value && modal.statusOptionSelected]}
              onPress={() => onSelect(opt.value)}
            >
              <View style={[modal.statusDot, { backgroundColor: opt.color }]} />
              <Text style={[modal.statusOptionText, value === opt.value && { color: '#1B4332', fontWeight: '700' }]}>
                {opt.label}
              </Text>
              {value === opt.value && <Ionicons name="checkmark" size={16} color="#1B4332" />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
            <Text style={modal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Trucks Tab ────────────────────────────────────────────────────────────────

function TrucksTab() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [statusModal, setStatusModal] = useState<{ truck: any } | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'trucks'],
    queryFn: adminApi.getTrucks,
    staleTime: 30_000,
  });
  const trucks = data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      adminApi.updateTruck(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trucks'] });
      setStatusModal(null);
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed to update truck'),
  });

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#1B4332" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={trucks}
          keyExtractor={(t: any) => t.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-sport-outline" size={56} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No trucks yet</Text>
              <Text style={styles.emptySub}>Tap + to add a truck</Text>
            </View>
          }
          renderItem={({ item: truck }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setStatusModal({ truck })}
              activeOpacity={0.78}
            >
              <View style={[styles.vehicleIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="car-sport-outline" size={22} color="#1E40AF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehiclePlate}>{truck.plateNumber}</Text>
                {(truck.make || truck.model) && (
                  <Text style={styles.vehicleSub}>
                    {[truck.make, truck.model].filter(Boolean).join(' ')}
                  </Text>
                )}
                {truck.capacityKg && (
                  <Text style={styles.vehicleMeta}>
                    {Number(truck.capacityKg).toLocaleString()} kg capacity
                  </Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: truckStatusBg(truck.status) }]}>
                <Text style={[styles.statusText, { color: truckStatusColor(truck.status) }]}>
                  {truck.status.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {showAdd && <AddTruckModal onClose={() => setShowAdd(false)} />}

      {statusModal && (
        <StatusPickerModal
          title={`Update ${statusModal.truck.plateNumber}`}
          value={statusModal.truck.status}
          options={[
            { value: 'active',   label: 'Active',   color: '#059669' },
            { value: 'inactive', label: 'Inactive', color: '#6B7280' },
          ]}
          onSelect={(s: 'active' | 'inactive') =>
            updateMutation.mutate({ id: statusModal.truck.id, status: s })
          }
          onClose={() => setStatusModal(null)}
        />
      )}
    </View>
  );
}

// ─── Drivers Tab ───────────────────────────────────────────────────────────────

function DriversTab() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [statusModal, setStatusModal] = useState<{ driver: any } | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: adminApi.getDrivers,
    staleTime: 30_000,
  });

  // Also fetch trucks to show plate for driver
  const trucksQ = useQuery({
    queryKey: ['admin', 'trucks'],
    queryFn: adminApi.getTrucks,
    staleTime: 60_000,
  });
  const trucksMap: Record<string, any> = Object.fromEntries(
    (trucksQ.data?.data ?? []).map((t: any) => [t.id, t])
  );

  const drivers = data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' | 'suspended' }) =>
      adminApi.updateDriver(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      setStatusModal(null);
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed to update driver'),
  });

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#1B4332" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(d: any) => d.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-circle-outline" size={56} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No drivers yet</Text>
              <Text style={styles.emptySub}>Tap + to add a driver</Text>
            </View>
          }
          renderItem={({ item: driver }) => {
            const assignedTruck = driver.truckId ? trucksMap[driver.truckId] : null;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setStatusModal({ driver })}
                activeOpacity={0.78}
              >
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>{(driver.name || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverPhone}>{driver.phone}</Text>
                  {driver.licenseNumber && (
                    <Text style={styles.vehicleMeta}>License: {driver.licenseNumber}</Text>
                  )}
                  {assignedTruck && (
                    <View style={styles.assignedTruck}>
                      <Ionicons name="car-sport-outline" size={12} color="#1E40AF" />
                      <Text style={styles.assignedTruckText}>{assignedTruck.plateNumber}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: driverStatusBg(driver.status) }]}>
                  <Text style={[styles.statusText, { color: driverStatusColor(driver.status) }]}>
                    {driver.status.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {showAdd && <AddDriverModal onClose={() => setShowAdd(false)} />}

      {statusModal && (
        <StatusPickerModal
          title={`Update ${statusModal.driver.name}`}
          value={statusModal.driver.status}
          options={[
            { value: 'active',    label: 'Active',    color: '#059669' },
            { value: 'inactive',  label: 'Inactive',  color: '#6B7280' },
            { value: 'suspended', label: 'Suspended', color: '#DC2626' },
          ]}
          onSelect={(s: 'active' | 'inactive' | 'suspended') =>
            updateMutation.mutate({ id: statusModal.driver.id, status: s })
          }
          onClose={() => setStatusModal(null)}
        />
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminLogistics() {
  const [tab, setTab] = useState<Tab>('trucks');

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['trucks', 'drivers'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Ionicons
              name={t === 'trucks' ? 'car-sport-outline' : 'person-circle-outline'}
              size={16}
              color={tab === t ? '#fff' : '#6B7280'}
            />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'trucks' ? <TrucksTab /> : <DriversTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  tabRow: {
    flexDirection: 'row', padding: 12, gap: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#1B4332' },
  tabText:       { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },

  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },

  vehicleIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  vehiclePlate: { fontSize: 15, fontWeight: '800', color: '#111827' },
  vehicleSub:   { fontSize: 12, color: '#6B7280', marginTop: 2 },
  vehicleMeta:  { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  driverAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1A1D21', alignItems: 'center', justifyContent: 'center',
  },
  driverAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  driverName:       { fontSize: 15, fontWeight: '700', color: '#111827' },
  driverPhone:      { fontSize: 12, color: '#1B4332', fontWeight: '600', marginTop: 1 },

  assignedTruck: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  assignedTruckText: { fontSize: 11, color: '#1E40AF', fontWeight: '600' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  statusText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1B4332',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },

  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub:   { fontSize: 13, color: '#9CA3AF' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40,
  },
  handle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:  { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  label:  { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827',
    marginBottom: 14,
  },
  truckOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginBottom: 4,
  },
  truckOptionSelected: { backgroundColor: '#F0FDF4' },
  truckOptionText:     { fontSize: 13, color: '#374151' },

  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  statusOptionSelected: { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 12 },
  statusOptionText: { fontSize: 15, color: '#374151', flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  confirmBtn: {
    backgroundColor: '#1B4332', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#9CA3AF' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn:   { alignItems: 'center', paddingVertical: 12 },
  cancelText:  { fontSize: 14, color: '#6B7280' },
});
