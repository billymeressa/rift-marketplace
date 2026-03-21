import { Platform } from 'react-native';
import { getToken, removeToken, removeUser } from './auth';

// Android emulator routes localhost → 10.0.2.2 (host machine)
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}:3000/api/v1`;

// Global sign-out callback registered by the auth provider
let _onUnauthorized: (() => void) | null = null;
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
    if (response.status === 401) {
      await removeToken();
      await removeUser();
      _onUnauthorized?.();
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

  payOrder: (id: string) =>
    apiRequest<any>(`/orders/${id}/pay`, { method: 'PUT' }),

  shipOrder: (id: string) =>
    apiRequest<any>(`/orders/${id}/ship`, { method: 'PUT' }),

  confirmDelivery: (id: string) =>
    apiRequest<any>(`/orders/${id}/confirm-delivery`, { method: 'PUT' }),

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
