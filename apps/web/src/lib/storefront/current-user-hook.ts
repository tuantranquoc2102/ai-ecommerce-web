'use client';

import { useEffect, useState } from 'react';
import { ApiError, fetchMe, logout, tokenStore, type Me } from '../api-client';

/**
 * Storefront customer session hook. Reads the (localStorage) JWT and resolves
 * `/auth/me`. Returns `null` when the shopper is a guest. Fully client-side —
 * SSR always sees `loading = true` on first render, then flips post-hydration.
 *
 * Not a heavy identity hook (no permissions, no roles surfaced here); the
 * storefront just needs "am I signed in, and what's my email/name" to
 * pre-fill checkout and show account links.
 */
export function useCurrentCustomer(): {
  user: Me | null;
  loading: boolean;
  signOut: () => void;
} {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Sequence guard: only the most recent load may commit, so overlapping
    // runs (e.g. a token write firing while a fetch is in flight) can't
    // clobber each other with stale results.
    let seq = 0;

    async function load() {
      const my = ++seq;
      const tokens = tokenStore.read();
      if (!tokens) {
        if (active && my === seq) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      if (active) setLoading(true);
      try {
        const me = await fetchMe();
        if (active && my === seq) setUser(me);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          tokenStore.write(null);
        }
        if (active && my === seq) setUser(null);
      } finally {
        if (active && my === seq) setLoading(false);
      }
    }

    void load();
    // Re-resolve the session whenever tokens change (login, register, signOut,
    // or a write in another tab) so the persistent header updates without a
    // full page reload.
    const unsubscribe = tokenStore.subscribe(() => void load());
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  function signOut() {
    // Revoke server-side too; local tokens are cleared by logout() regardless.
    void logout();
    setUser(null);
  }

  return { user, loading, signOut };
}
