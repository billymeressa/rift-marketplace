import * as SecureStore from 'expo-secure-store';

// Android emulator routes localhost → 10.0.2.2 (host machine)
import { Platform } from 'react-native';
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}:3000/api/v1`;

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
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
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  sendOtp: (phone: string) =>
    apiRequest<{ message: string; phone: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string) =>
    apiRequest<{ token: string; user: any }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

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
};
