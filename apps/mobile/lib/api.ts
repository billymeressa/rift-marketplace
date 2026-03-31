import { Platform } from 'react-native';
import { getToken, removeToken, removeUser } from './auth';


// Android emulator routes localhost → 10.0.2.2 (host machine)
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}:3000/api/v1`;

// ─── Admin API ────────────────────────────────────────────────────────────────
const ADMIN_KEY = process.env.EXPO_PUBLIC_ADMIN_KEY || '';

async function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  // Send both admin key and JWT so either form of auth works
  if (ADMIN_KEY) headers['X-Admin-Key'] = ADMIN_KEY;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Admin request failed: ${res.status}`);
  }
  return res.json();
}

export const adminApi = {
  getStats: () =>
    adminRequest<{
      totalUsers: number; newUsersToday: number;
      totalListings: number; activeListings: number;
      totalOrders: number; pendingVerifications: number;
      totalConversations: number; activeConversations: number;
    }>('/admin/stats'),

  getConversations: (page = 1, limit = 50) =>
    adminRequest<{ data: any[]; page: number; limit: number }>(
      `/admin/conversations?page=${page}&limit=${limit}`
    ),
  getConversation: (id: string) =>
    adminRequest<{ conversation: any; messages: any[] }>(
      `/admin/conversations/${id}`
    ),

  getUsers: (page = 1, limit = 200) =>
    adminRequest<{ data: any[]; page: number; limit: number }>(
      `/admin/users?page=${page}&limit=${limit}`
    ),
  deleteUser: (id: string) =>
    adminRequest<{ message: string }>(`/admin/users/${id}`, { method: 'DELETE' }),

  getListings: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return adminRequest<{ data: any[]; total: number; page: number; limit: number }>(
      `/admin/listings${q}`
    );
  },
  updateListingStatus: (id: string, status: 'active' | 'closed') =>
    adminRequest<{ id: string; status: string }>(`/admin/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getVerifications: (status = 'pending', page = 1) =>
    adminRequest<{ data: any[]; page: number; limit: number }>(
      `/admin/verifications?status=${status}&page=${page}&limit=100`
    ),
  reviewVerification: (id: string, status: 'approved' | 'rejected', note?: string) =>
    adminRequest<any>(`/admin/verifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),

  // Admin - Orders
  getOrders: (params?: { status?: string; escrowStatus?: string; page?: number; limit?: number }) => {
    const q = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return adminRequest<{ data: any[]; page: number; limit: number; total: number; hasMore: boolean }>(
      `/admin/orders${q}`
    );
  },
  getOrder: (id: string) => adminRequest<any>(`/admin/orders/${id}`),

  getInspectors: () => adminRequest<{ data: any[] }>('/admin/inspectors'),

  assignInspector: (orderId: string, inspectorId: string) =>
    adminRequest<any>(`/admin/orders/${orderId}/assign-inspector`, {
      method: 'POST',
      body: JSON.stringify({ inspectorId }),
    }),

  assignTruck: (orderId: string, truckId: string, driverId: string) =>
    adminRequest<any>(`/admin/orders/${orderId}/assign-truck`, {
      method: 'POST',
      body: JSON.stringify({ truckId, driverId }),
    }),

  releaseEscrow: (orderId: string) =>
    adminRequest<any>(`/admin/orders/${orderId}/release-escrow`, { method: 'POST' }),

  refundEscrow: (orderId: string) =>
    adminRequest<any>(`/admin/orders/${orderId}/refund-escrow`, { method: 'POST' }),

  getEscrowSummary: () =>
    adminRequest<{ totalHeld: number; countHeld: number; countDisputed: number; countAutoReleasing: number }>(
      '/admin/escrow/summary'
    ),

  runAutoRelease: () =>
    adminRequest<{ released: number; message: string }>('/admin/escrow/auto-release', { method: 'POST' }),

  // Admin - Logistics
  getTrucks: () => adminRequest<{ data: any[] }>('/logistics/trucks'),
  addTruck: (data: { plateNumber: string; make?: string; model?: string; capacityKg?: number }) =>
    adminRequest<any>('/logistics/trucks', { method: 'POST', body: JSON.stringify(data) }),
  updateTruck: (id: string, status: 'active' | 'inactive') =>
    adminRequest<any>(`/logistics/trucks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getDrivers: () => adminRequest<{ data: any[] }>('/logistics/drivers'),
  addDriver: (data: { name: string; phone: string; licenseNumber?: string; truckId?: string }) =>
    adminRequest<any>('/logistics/drivers', { method: 'POST', body: JSON.stringify(data) }),
  updateDriver: (id: string, status: 'active' | 'inactive' | 'suspended') =>
    adminRequest<any>(`/logistics/drivers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ─── User-facing API ──────────────────────────────────────────────────────────
// Global sign-out callback registered by the auth provider
let _onUnauthorized: (() => void) | null = null;
let _isSigningOut = false;
export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Expired/invalid token — sign out so the app redirects to login
    if (response.status === 401 && !_isSigningOut) {
      _isSigningOut = true;
      await removeToken();
      await removeUser();
      _onUnauthorized?.();
      // Reset after a short delay to allow re-auth
      setTimeout(() => { _isSigningOut = false; }, 2000);
    }
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth — Telegram OTP
  sendCode: (phone: string, name?: string) =>
    apiRequest<{ isNewUser: boolean; telegramLink: string | null; session: string; message: string; devCode?: string }>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone, ...(name ? { name } : {}) }),
    }),

  verifyCode: (phone: string, code: string, name?: string) =>
    apiRequest<{ token: string; user: any }>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone, code, ...(name ? { name } : {}) }),
    }),

  /** Telegram Mini App login — exchanges Telegram initData for a JWT.
   *  First call (no name): returns { isNewUser: true } for new users.
   *  Second call (with name): creates the account and returns { token, user }. */
  telegramMiniAppLogin: (initData: string, name?: string, phone?: string) =>
    apiRequest<{ token?: string; user?: any; isNewUser?: boolean }>(
      '/auth/telegram-mini-app',
      { method: 'POST', body: JSON.stringify({ initData, name, phone }) },
    ),

  deleteAccount: () =>
    apiRequest<{ message: string }>('/auth/account', { method: 'DELETE' }),

  // Suggestions
  getSuggestions: (field: string, q?: string) => {
    const params = new URLSearchParams({ field });
    if (q) params.set('q', q);
    return apiRequest<{ value: string; count: number; label?: string }[]>(`/suggestions?${params}`);
  },

  // Upload
  uploadImage: (base64: string) =>
    apiRequest<{ url: string; publicId: string }>('/upload', {
      method: 'POST',
      body: JSON.stringify({ image: base64 }),
    }),

  // Recommendations
  getRecommendations: () =>
    apiRequest<{ data: any[] }>('/recommendations'),

  // Listings
  getListings: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<any>(`/listings${query}`);
  },

  getListing: (id: string) => apiRequest<any>(`/listings/${id}`),

  createListing: (data: any) =>
    apiRequest<any>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateListing: (id: string, data: any) =>
    apiRequest<any>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteListing: (id: string) =>
    apiRequest<any>(`/listings/${id}`, { method: 'DELETE' }),

  // Push notifications
  savePushToken: (token: string) =>
    apiRequest<{ ok: boolean }>('/users/push-token', {
      method: 'PUT',
      body: JSON.stringify({ token }),
    }),

  // Users
  getProfile: () => apiRequest<any>('/users/me'),

  updateProfile: (data: any) =>
    apiRequest<any>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getUserTrust: (id: string) => apiRequest<any>(`/users/${id}/trust`),

  // Orders
  createOrder: (data: any) =>
    apiRequest<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),

  getOrders: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<any>(`/orders${query}`);
  },

  getOrder: (id: string) => apiRequest<any>(`/orders/${id}`),

  acceptOrder: (id: string) =>
    apiRequest<any>(`/orders/${id}/accept`, { method: 'PUT' }),

  rejectOrder: (id: string) =>
    apiRequest<any>(`/orders/${id}/reject`, { method: 'PUT' }),

  counterOrder: (id: string, data: any) =>
    apiRequest<any>(`/orders/${id}/counter`, { method: 'PUT', body: JSON.stringify(data) }),

  payOrder: (id: string, gateway?: 'chapa' | 'stripe' | 'telebirr') =>
    apiRequest<{ checkoutUrl: string; txRef: string; gateway: string; amount: number; platformFee: number; currency: string }>(
      `/orders/${id}/pay`, { method: 'PUT', body: JSON.stringify({ gateway }) }
    ),

  checkPaymentStatus: (id: string) =>
    apiRequest<{ paymentStatus: 'success' | 'failed' | 'pending' | 'not_initiated'; orderStatus: string; escrowStatus: string }>(
      `/orders/${id}/payment-status`
    ),

  devConfirmPayment: (txRef: string) =>
    apiRequest<{ success: boolean; orderId: string }>(`/payments/dev-confirm/${txRef}`, { method: 'POST' }),

  assignInspector: (orderId: string, inspectorId: string) =>
    apiRequest<any>(`/orders/${orderId}/assign-inspector`, { method: 'POST', body: JSON.stringify({ inspectorId }) }),

  submitInspection: (orderId: string, data: { result: 'passed' | 'failed'; notes?: string; photos?: string[] }) =>
    apiRequest<any>(`/orders/${orderId}/inspection`, { method: 'POST', body: JSON.stringify(data) }),

  shipOrder: (orderId: string, truckInfo: { driverName: string; phone: string; plateNumber: string; waybillRef?: string }) =>
    apiRequest<any>(`/orders/${orderId}/ship`, { method: 'PUT', body: JSON.stringify(truckInfo) }),

  assignTruck: (orderId: string, data: { truckId: string; driverId: string }) =>
    apiRequest<any>(`/orders/${orderId}/assign-truck`, { method: 'POST', body: JSON.stringify(data) }),

  confirmPickup: (orderId: string, pickupPhotos?: string[]) =>
    apiRequest<any>(`/orders/${orderId}/ship`, { method: 'PUT', body: JSON.stringify({ pickupPhotos }) }),

  confirmDelivery: (orderId: string, data: { sealIntact: 'yes' | 'no'; photos?: string[] }) =>
    apiRequest<any>(`/orders/${orderId}/confirm-delivery`, { method: 'PUT', body: JSON.stringify(data) }),

  disputeOrder: (id: string, reason: string) =>
    apiRequest<any>(`/orders/${id}/dispute`, { method: 'PUT', body: JSON.stringify({ reason }) }),

  cancelOrder: (id: string) =>
    apiRequest<any>(`/orders/${id}/cancel`, { method: 'PUT' }),

  // Verification
  getMyVerification: () => apiRequest<any>('/verification/me'),

  submitVerification: (data: any) =>
    apiRequest<any>('/verification', { method: 'POST', body: JSON.stringify(data) }),

  getUserVerification: (id: string) =>
    apiRequest<any>(`/verification/user/${id}`),

  // Reviews
  createReview: (data: any) =>
    apiRequest<any>('/reviews', { method: 'POST', body: JSON.stringify(data) }),

  getUserReviews: (id: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<any>(`/reviews/user/${id}${query}`);
  },

  // Messages
  getConversations: () =>
    apiRequest<{ data: any[] }>('/messages/conversations'),

  getMessages: (conversationId: string, before?: string) => {
    const params = before ? `?before=${before}` : '';
    return apiRequest<{ data: any[] }>(`/messages/conversations/${conversationId}${params}`);
  },

  startConversation: (listingId: string, message: string) =>
    apiRequest<{ conversationId: string; message: any }>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ listingId, message }),
    }),

  sendMessage: (conversationId: string, body: string, type: string = 'text') =>
    apiRequest<any>(`/messages/conversations/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ body, type }),
    }),

  getUnreadCount: () =>
    apiRequest<{ count: number }>('/messages/unread-count'),

  // Deposit Verification
  getDepositBanks: () =>
    apiRequest<{ banks: string[] }>('/deposit-verification/banks'),

  getMyDepositVerification: () =>
    apiRequest<any>('/deposit-verification/me'),

  initiateDepositVerification: (data: { accountHolder: string; accountNumber: string; bankName: string }) =>
    apiRequest<any>('/deposit-verification', { method: 'POST', body: JSON.stringify(data) }),

  confirmDepositVerification: (amount1: number, amount2: number) =>
    apiRequest<any>('/deposit-verification/confirm', {
      method: 'POST',
      body: JSON.stringify({ amount1, amount2 }),
    }),

  // Feedback
  submitFeedback: (data: { type: string; message?: string; nps?: number }) =>
    apiRequest<{ id: string; message: string }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
