export interface Session {
  accessToken: string;
  refreshToken: string;
  fullname: string;
  email: string;
}

const key = 'dashboardSession';
const event = 'dashboard-session-change';

// This checks token shape/expiry for UI state only. The API verifies signatures.
export function tokenExpiresAt(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !part)) return 0;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    if (value && typeof value.accessToken === 'string' &&
        typeof value.refreshToken === 'string' && value.refreshToken.trim() &&
        typeof value.fullname === 'string' && typeof value.email === 'string' &&
        tokenExpiresAt(value.accessToken) > Date.now()) return value;
  } catch { /* Invalid saved sessions are treated as signed out. */ }
  return null;
}

export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(key);
    storage.removeItem('accessToken');
    storage.removeItem('refreshToken');
  }
  window.dispatchEvent(new Event(event));
}

export function saveSession(session: Session, remember: boolean) {
  clearSession();
  (remember ? localStorage : sessionStorage).setItem(key, JSON.stringify(session));
  window.dispatchEvent(new Event(event));
}

export function subscribeSession(listener: () => void) {
  window.addEventListener(event, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(event, listener);
    window.removeEventListener('storage', listener);
  };
}
