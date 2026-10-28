import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api'
).replace(/\/$/, '');
let token: string | null = null;
export async function restoreToken() {
  token =
    Platform.OS === 'web'
      ? null
      : await SecureStore.getItemAsync('pulse-token');
  return token;
}
export async function saveToken(value: string | null) {
  token = value;
  if (Platform.OS !== 'web') {
    if (value) await SecureStore.setItemAsync('pulse-token', value);
    else await SecureStore.deleteItemAsync('pulse-token');
  }
}
export async function api(path: string, method = 'GET', body?: unknown) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(API_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    if (response.status === 204) return null;
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error?.details
          ?.map((d: any) => `${d.path}: ${d.message}`)
          .join('\n') ||
          data.error?.message ||
          'Request failed',
      );
    return data;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError')
      throw new Error('Request timed out. Check your API connection.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
