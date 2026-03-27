import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Platform, Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

// ── Document upload helper ────────────────────────────────────────────────────
// Uses the existing Cloudinary upload endpoint
async function pickAndUpload(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // Web: use a hidden file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const result = await api.uploadImage(base64);
            resolve(result.url);
          } catch { resolve(null); }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }
  // Native: use expo-image-picker dynamically to avoid web bundle errors
  try {
    const ImagePicker = await import('expo-image-picker');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library to upload documents.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return null;
    const uploaded = await api.uploadImage(result.assets[0].base64!);
    return uploaded.url;
  } catch {
    Alert.alert('Error', 'Could not open image picker.');
    return null;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { key: 'exporter',    label: 'Licensed Exporter',  icon: 'airplane-outline' as const },
  { key: 'cooperative', label: 'Cooperative / Union', icon: 'people-outline' as const },
  { key: 'trader',      label: 'Commodity Trader',   icon: 'swap-horizontal-outline' as const },
  { key: 'farmer',      label: 'Producer / Farmer',  icon: 'leaf-outline' as const },
];

const STEPS = ['Business Info', 'Documents', 'Review'];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <View style={si.row}>
      {STEPS.map((label, i) => (
        <View key={label} style={si.item}>
          <View style={[si.circle, i < current && si.done, i === current && si.active]}>
            {i < current
              ? <Ionicons name="checkmark" size={14} color="#fff" />
              : <Text style={[si.num, i === current && si.numActive]}>{i + 1}</Text>
            }
          </View>
          <Text style={[si.label, i === current && si.labelActive]}>{label}</Text>
          {i < STEPS.length - 1 && <View style={[si.line, i < current && si.lineDone]} />}
        </View>
      ))}
    </View>
  );
}

const si = StyleSheet.create({
  row:        { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', marginBottom: 28, gap: 0 },
  item:       { alignItems: 'center', flex: 1, position: 'relative' },
  circle:     { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  done:       { backgroundColor: '#1B4332' },
  active:     { backgroundColor: '#1B4332' },
  num:        { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  numActive:  { color: '#fff' },
  label:      { fontSize: 10, color: '#9CA3AF', textAlign: 'center', fontWeight: '500' },
  labelActive:{ color: '#1B4332', fontWeight: '700' },
  line: {
    position: 'absolute', top: 14, left: '60%', right: '-60%',
    height: 1.5, backgroundColor: '#E5E7EB', zIndex: -1,
  },
  lineDone:   { backgroundColor: '#1B4332' },
});

function DocUploadRow({
  label, required, url, uploading, onUpload, onRemove,
}: {
  label: string; required?: boolean; url: string | null;
  uploading: boolean; onUpload: () => void; onRemove: () => void;
}) {
  return (
    <View style={doc.row}>
      <View style={doc.labelRow}>
        <Text style={doc.label}>{label}{required ? ' *' : ''}</Text>
        {!required && <Text style={doc.optional}>(optional)</Text>}
      </View>
      {url ? (
        <View style={doc.preview}>
          <Image source={{ uri: url }} style={doc.thumb} resizeMode="cover" />
          <View style={doc.previewInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#1B4332" />
            <Text style={doc.uploaded}>Uploaded</Text>
          </View>
          <TouchableOpacity onPress={onRemove} style={doc.removeBtn}>
            <Ionicons name="close-circle" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={doc.uploadBtn} onPress={onUpload} disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color="#1B4332" />
            : <>
                <Ionicons name="cloud-upload-outline" size={20} color="#1B4332" />
                <Text style={doc.uploadText}>Tap to upload photo or PDF</Text>
              </>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

const doc = StyleSheet.create({
  row:        { marginBottom: 16 },
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label:      { fontSize: 14, fontWeight: '600', color: '#374151' },
  optional:   { fontSize: 12, color: '#9CA3AF' },
  uploadBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#1B4332', borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 18, backgroundColor: '#F0FDF4',
  },
  uploadText: { fontSize: 13, color: '#1B4332', fontWeight: '600' },
  preview:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  thumb:      { width: 48, height: 48, borderRadius: 6 },
  previewInfo:{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  uploaded:   { fontSize: 13, color: '#1B4332', fontWeight: '600' },
  removeBtn:  { padding: 4 },
});

// ── Status views ───────────────────────────────────────────────────────────────

function StatusView({ verification, onResubmit }: { verification: any; onResubmit: () => void }) {
  const status = verification?.verificationStatus ?? verification?.status;
  const isPending  = status === 'pending';
  const isVerified = status === 'approved' || status === 'verified';
  const isRejected = status === 'rejected';

  if (isVerified) {
    return (
      <View style={sv.container}>
        <View style={sv.iconWrap}>
          <Ionicons name="shield-checkmark" size={64} color="#1B4332" />
        </View>
        <Text style={sv.title}>Verified Exporter</Text>
        <Text style={sv.sub}>Your business has been verified. Your listings now display a verified badge, building trust with buyers.</Text>
        <View style={sv.detailBox}>
          {verification.businessName && <Text style={sv.detail}>📋 {verification.businessName}</Text>}
          {verification.businessType && (
            <Text style={sv.detail}>
              🏷️ {BUSINESS_TYPES.find(t => t.key === verification.businessType)?.label ?? verification.businessType}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={sv.container}>
        <View style={[sv.iconWrap, sv.pendingIcon]}>
          <Ionicons name="time" size={64} color="#D97706" />
        </View>
        <Text style={[sv.title, sv.pendingTitle]}>Under Review</Text>
        <Text style={sv.sub}>Your verification application is being reviewed. This typically takes 1–2 business days.</Text>
        <View style={sv.detailBox}>
          {verification.businessName && <Text style={sv.detail}>📋 {verification.businessName}</Text>}
        </View>
        <View style={sv.timelineBox}>
          <View style={sv.timelineRow}>
            <View style={[sv.dot, sv.dotDone]} />
            <Text style={sv.timelineText}>Application submitted</Text>
          </View>
          <View style={sv.timelineLine} />
          <View style={sv.timelineRow}>
            <View style={[sv.dot, sv.dotActive]} />
            <Text style={sv.timelineText}>Document review in progress</Text>
          </View>
          <View style={sv.timelineLine} />
          <View style={sv.timelineRow}>
            <View style={sv.dot} />
            <Text style={[sv.timelineText, { color: '#9CA3AF' }]}>Verification decision</Text>
          </View>
        </View>
      </View>
    );
  }

  if (isRejected) {
    return (
      <View style={sv.container}>
        <View style={[sv.iconWrap, sv.rejectedIcon]}>
          <Ionicons name="close-circle" size={64} color="#DC2626" />
        </View>
        <Text style={[sv.title, sv.rejectedTitle]}>Application Rejected</Text>
        {verification.reviewNote ? (
          <View style={sv.noteBox}>
            <Text style={sv.noteLabel}>Reason from reviewer:</Text>
            <Text style={sv.noteText}>"{verification.reviewNote}"</Text>
          </View>
        ) : (
          <Text style={sv.sub}>Your application was not approved. Please review your documents and resubmit.</Text>
        )}
        <TouchableOpacity style={sv.resubmitBtn} onPress={onResubmit}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={sv.resubmitText}>Resubmit Application</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const sv = StyleSheet.create({
  container:    { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20 },
  iconWrap:     { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  pendingIcon:  { backgroundColor: '#FFFBEB' },
  rejectedIcon: { backgroundColor: '#FEF2F2' },
  title:        { fontSize: 22, fontWeight: '800', color: '#1B4332', marginBottom: 8, textAlign: 'center' },
  pendingTitle: { color: '#D97706' },
  rejectedTitle:{ color: '#DC2626' },
  sub:          { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  detailBox:    { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, gap: 8, width: '100%', marginBottom: 20 },
  detail:       { fontSize: 14, color: '#374151' },
  timelineBox:  { width: '100%', gap: 0 },
  timelineRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot:          { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#E5E7EB' },
  dotDone:      { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  dotActive:    { backgroundColor: '#fff', borderColor: '#D97706', width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  timelineLine: { width: 2, height: 20, backgroundColor: '#E5E7EB', marginLeft: 5 },
  timelineText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  noteBox:      { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, width: '100%', marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  noteLabel:    { fontSize: 12, fontWeight: '700', color: '#DC2626', marginBottom: 6 },
  noteText:     { fontSize: 14, color: '#374151', fontStyle: 'italic', lineHeight: 20 },
  resubmitBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1B4332', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 4 },
  resubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function VerificationScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: verification, isLoading } = useQuery({
    queryKey: ['myVerification'],
    queryFn: () => api.getMyVerification(),
  });

  const [step, setStep] = useState(0);
  const [forceForm, setForceForm] = useState(false);

  // Step 1 fields
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');

  // Step 2 fields — document URLs after upload
  const [tradeLicenseUrl, setTradeLicenseUrl] = useState<string | null>(null);
  const [exportLicenseUrl, setExportLicenseUrl] = useState<string | null>(null);
  const [ecxMembershipUrl, setEcxMembershipUrl] = useState<string | null>(null);

  // Upload loading states
  const [uploadingTrade,  setUploadingTrade]  = useState(false);
  const [uploadingExport, setUploadingExport] = useState(false);
  const [uploadingEcx,    setUploadingEcx]    = useState(false);

  const mutation = useMutation({
    mutationFn: (data: any) => api.submitVerification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myVerification'] });
      setForceForm(false);
    },
    onError: (error: any) => {
      Alert.alert('Submission Failed', error.message || t('common.error'));
    },
  });

  async function handleDocUpload(
    setter: (url: string | null) => void,
    loadingSetter: (v: boolean) => void,
  ) {
    loadingSetter(true);
    try {
      const url = await pickAndUpload();
      if (url) setter(url);
    } finally {
      loadingSetter(false);
    }
  }

  const handleSubmit = () => {
    mutation.mutate({
      businessName: businessName.trim(),
      businessType,
      tradeLicenseUrl: tradeLicenseUrl ?? undefined,
      exportLicenseUrl: exportLicenseUrl ?? undefined,
      ecxMembershipUrl: ecxMembershipUrl ?? undefined,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  const status = verification?.verificationStatus ?? verification?.status;
  const showStatus = !forceForm && (status === 'pending' || status === 'approved' || status === 'verified' || status === 'rejected');

  if (showStatus) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <StatusView verification={verification} onResubmit={() => { setForceForm(true); setStep(0); }} />
      </ScrollView>
    );
  }

  // ── Step 1: Business Info ──────────────────────────────────────────────────
  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Tell us about your business</Text>
      <Text style={styles.stepSub}>This information will appear on your verified seller profile.</Text>

      <Text style={styles.fieldLabel}>Business / Company Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Harar Coffee Export PLC"
        placeholderTextColor="#9CA3AF"
        value={businessName}
        onChangeText={setBusinessName}
        autoCapitalize="words"
      />

      <Text style={styles.fieldLabel}>Business Type *</Text>
      <View style={styles.typeGrid}>
        {BUSINESS_TYPES.map(bt => {
          const selected = businessType === bt.key;
          return (
            <TouchableOpacity
              key={bt.key}
              style={[styles.typeCard, selected && styles.typeCardSelected]}
              onPress={() => setBusinessType(bt.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={bt.icon} size={22} color={selected ? '#1B4332' : '#9CA3AF'} />
              <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{bt.label}</Text>
              {selected && (
                <View style={styles.typeCheck}>
                  <Ionicons name="checkmark-circle" size={16} color="#1B4332" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.nextBtn, (!businessName.trim() || !businessType) && styles.btnDisabled]}
        onPress={() => setStep(1)}
        disabled={!businessName.trim() || !businessType}
      >
        <Text style={styles.nextBtnText}>Next: Upload Documents</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // ── Step 2: Documents ──────────────────────────────────────────────────────
  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Upload Verification Documents</Text>
      <Text style={styles.stepSub}>Upload clear photos or scans. At least your trade license is required.</Text>

      <View style={styles.infoBox}>
        <Ionicons name="lock-closed-outline" size={14} color="#1E40AF" />
        <Text style={styles.infoText}>Documents are stored securely and only reviewed by Nile Xport staff.</Text>
      </View>

      <DocUploadRow
        label="Trade License / Business Registration"
        required
        url={tradeLicenseUrl}
        uploading={uploadingTrade}
        onUpload={() => handleDocUpload(setTradeLicenseUrl, setUploadingTrade)}
        onRemove={() => setTradeLicenseUrl(null)}
      />

      <DocUploadRow
        label="Export License"
        url={exportLicenseUrl}
        uploading={uploadingExport}
        onUpload={() => handleDocUpload(setExportLicenseUrl, setUploadingExport)}
        onRemove={() => setExportLicenseUrl(null)}
      />

      <DocUploadRow
        label="ECX Membership Certificate"
        url={ecxMembershipUrl}
        uploading={uploadingEcx}
        onUpload={() => handleDocUpload(setEcxMembershipUrl, setUploadingEcx)}
        onRemove={() => setEcxMembershipUrl(null)}
      />

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(0)}>
          <Ionicons name="arrow-back" size={18} color="#1B4332" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { flex: 1 }, !tradeLicenseUrl && styles.btnDisabled]}
          onPress={() => setStep(2)}
          disabled={!tradeLicenseUrl}
        >
          <Text style={styles.nextBtnText}>Review & Submit</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 3: Review & Submit ────────────────────────────────────────────────
  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Review Your Application</Text>
      <Text style={styles.stepSub}>Please confirm the details below before submitting.</Text>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewSection}>BUSINESS INFORMATION</Text>
        <View style={styles.reviewRow}>
          <Ionicons name="business-outline" size={16} color="#6B7280" />
          <Text style={styles.reviewValue}>{businessName}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
          <Text style={styles.reviewValue}>
            {BUSINESS_TYPES.find(t => t.key === businessType)?.label ?? businessType}
          </Text>
        </View>
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewSection}>UPLOADED DOCUMENTS</Text>
        {[
          { label: 'Trade License', url: tradeLicenseUrl, required: true },
          { label: 'Export License', url: exportLicenseUrl },
          { label: 'ECX Membership', url: ecxMembershipUrl },
        ].map(d => (
          <View key={d.label} style={styles.reviewRow}>
            <Ionicons
              name={d.url ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={d.url ? '#1B4332' : '#9CA3AF'}
            />
            <Text style={[styles.reviewValue, !d.url && { color: '#9CA3AF' }]}>
              {d.label}{d.url ? '' : ' — not provided'}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.disclaimerBox}>
        <Ionicons name="information-circle-outline" size={15} color="#6B7280" />
        <Text style={styles.disclaimerText}>
          By submitting, you confirm that all provided information is accurate. False information may result in account suspension.
        </Text>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={18} color="#1B4332" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, { flex: 1 }, mutation.isPending && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="shield-checkmark" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit for Verification</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark-outline" size={28} color="#1B4332" />
        </View>
        <Text style={styles.heading}>Get Verified</Text>
        <Text style={styles.headingSub}>Verified exporters get a trust badge, more visibility, and higher buyer confidence.</Text>
      </View>

      <StepIndicator current={step} />

      {step === 0 && renderStep1()}
      {step === 1 && renderStep2()}
      {step === 2 && renderStep3()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content:   { padding: 20, paddingBottom: 48 },
  loader:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      { alignItems: 'center', marginBottom: 28 },
  headerIcon:  { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heading:     { fontSize: 22, fontWeight: '800', color: '#1A1D21', marginBottom: 6 },
  headingSub:  { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19 },

  stepTitle: { fontSize: 17, fontWeight: '700', color: '#1A1D21', marginBottom: 4 },
  stepSub:   { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 20 },

  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#1A1D21', backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },

  typeGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  typeCard:         { width: '47%', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA', gap: 6, position: 'relative' },
  typeCardSelected: { borderColor: '#1B4332', backgroundColor: '#ECFDF5' },
  typeLabel:        { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  typeLabelSelected:{ color: '#1B4332' },
  typeCheck:        { position: 'absolute', top: 8, right: 8 },

  infoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 17 },

  navRow:  { flexDirection: 'row', gap: 12, marginTop: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB' },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#1B4332' },

  nextBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1B4332', paddingVertical: 14, borderRadius: 12 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1B4332', paddingVertical: 14, borderRadius: 12 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.45 },

  reviewCard:    { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 14, gap: 10 },
  reviewSection: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 2 },
  reviewRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewValue:   { fontSize: 14, color: '#1A1D21', flex: 1 },

  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12, marginBottom: 16, marginTop: 4 },
  disclaimerText:{ flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 17 },
});
