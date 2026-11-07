import { useEffect, useState } from 'react';
import { clearSession, readSession, subscribeSession, tokenExpiresAt } from './session';

export function useAuth() {
  const [session, setSession] = useState(readSession);
  useEffect(() => subscribeSession(() => setSession(readSession())), []);
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(clearSession,
      Math.min(tokenExpiresAt(session.accessToken) - Date.now(), 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [session]);
  return { session, logout: clearSession };
}
