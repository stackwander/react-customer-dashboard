import axios from 'axios';
import { clearSession, readSession } from './auth/session';

export const authenticatedApi = axios.create({ timeout: 15_000 });

authenticatedApi.interceptors.request.use((config) => {
  const session = readSession();
  if (!session) {
    clearSession();
    throw new Error('Your session has expired. Please sign in again.');
  }
  config.headers.Authorization = `Bearer ${session.accessToken}`;
  return config;
});

authenticatedApi.interceptors.response.use((response) => response, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) clearSession();
  return Promise.reject(error);
});

export function requestError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) return message.join(' ');
    if (!error.response) return 'Cannot reach the server. Check your connection and try again.';
  }
  return fallback;
}
