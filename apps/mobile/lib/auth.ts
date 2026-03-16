import { createContext, useContext } from 'react';
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

export async function saveToken(token: string) {
  await SecureStore.setItemAsync('auth_token', token);
}

export async function getToken() {
  return SecureStore.getItemAsync('auth_token');
}

export async function removeToken() {
  await SecureStore.deleteItemAsync('auth_token');
}

export async function saveUser(user: any) {
  await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
}

export async function getUser() {
  const data = await SecureStore.getItemAsync('auth_user');
  return data ? JSON.parse(data) : null;
}

export async function removeUser() {
  await SecureStore.deleteItemAsync('auth_user');
}
