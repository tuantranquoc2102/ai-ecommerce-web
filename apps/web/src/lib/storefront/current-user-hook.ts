'use client';

import { useEffect, useState } from 'react';
import { ApiError, fetchMe, tokenStore, type Me } from '../api-client';

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
    let cancelled = false;
    (async () => {
      const tokens = tokenStore.read();
      if (!tokens) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          tokenStore.write(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function signOut() {
    tokenStore.write(null);
    setUser(null);
  }

  return { user, loading, signOut };
}
