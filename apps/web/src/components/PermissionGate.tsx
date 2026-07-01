'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { hasAny, loadPermissions, type PermissionPredicate } from '@/lib/permissions';

type Props = {
  predicate?: PermissionPredicate;
  /** Convenience: passes through to `hasAny(...)` if `predicate` isn't supplied. */
  codes?: string[];
  fallback?: ReactNode;
  children: ReactNode;
};

export function PermissionGate({ predicate, codes, fallback = null, children }: Props) {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let alive = true;
    const pred = predicate ?? (codes ? hasAny(...codes) : () => true);
    loadPermissions().then((set) => {
      if (!alive) return;
      setState(pred(set) ? 'allowed' : 'denied');
    });
    return () => {
      alive = false;
    };
  }, [predicate, codes]);

  if (state === 'allowed') return <>{children}</>;
  if (state === 'denied') return <>{fallback}</>;
  return null;
}
