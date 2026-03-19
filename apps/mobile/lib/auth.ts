import { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface AuthState {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  signIn: (token: string, user: any) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Platform-aware storage helpers
async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveToken(token: string) {
  await setItem('auth_token', token);
}

export async function getToken() {
  return getItem('auth_token');
}

export async function removeToken() {
  await deleteItem('auth_token');
}

export async function saveUser(user: any) {
  await setItem('auth_user', JSON.stringify(user));
}

export async function getUser() {
  const data = await getItem('auth_user');
  return data ? JSON.parse(data) : null;
}

export async function removeUser() {
  await deleteItem('auth_user');
}
