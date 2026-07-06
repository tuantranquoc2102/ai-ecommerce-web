import type { ApiResponse, AuthTokens, AuthUserView } from '@ecom/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
const API_PREFIX = '/api/v1';

const TOKEN_KEY = 'ecom.tokens';

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

function readTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

type TokenListener = () => void;
const tokenListeners = new Set<TokenListener>();
let storageListenerAttached = false;

function notifyTokenListeners(): void {
  for (const listener of tokenListeners) listener();
}

function writeTokens(tokens: AuthTokens | null): void {
  if (typeof window === 'undefined') return;
  if (!tokens) window.localStorage.removeItem(TOKEN_KEY);
  else window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  notifyTokenListeners();
}

/**
 * Subscribe to token changes (login, logout, refresh, and cross-tab writes via
 * the `storage` event). Returns an unsubscribe fn. Lets session-aware UI —
 * e.g. the persistent storefront header — react without a full page reload.
 */
function subscribeTokens(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  if (typeof window !== 'undefined' && !storageListenerAttached) {
    storageListenerAttached = true;
    window.addEventListener('storage', (e) => {
      if (e.key === TOKEN_KEY || e.key === null) notifyTokenListeners();
    });
  }
  return () => {
    tokenListeners.delete(listener);
  };
}

let refreshInFlight: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  if (refreshInFlight) return refreshInFlight;
  const current = readTokens();
  if (!current) return null;
  refreshInFlight = (async () => {
    const res = await fetch(`${API_BASE}${API_PREFIX}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!res.ok) {
      writeTokens(null);
      return null;
    }
    const payload = (await res.json()) as ApiResponse<AuthTokens>;
    if (!payload.success) {
      writeTokens(null);
      return null;
    }
    writeTokens(payload.data);
    return payload.data;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, ...rest } = init;
  const headers = new Headers(rest.headers);
  // For multipart/FormData bodies, let the browser set Content-Type with its
  // generated boundary. Otherwise default to JSON.
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  if (!isFormData && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const attach = (tokens: AuthTokens | null) => {
    if (auth && tokens) headers.set('authorization', `Bearer ${tokens.accessToken}`);
  };

  attach(readTokens());

  const send = () =>
    fetch(`${API_BASE}${API_PREFIX}${path}`, {
      ...rest,
      headers,
      credentials: 'include',
    });

  let res = await send();
  if (res.status === 401 && auth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      attach(refreshed);
      res = await send();
    }
  }

  const text = await res.text();
  const parsed = (text ? JSON.parse(text) : { success: true, data: null }) as ApiResponse<T>;
  if (!parsed.success) {
    throw new ApiError(parsed.error.code, parsed.error.message, res.status, parsed.error.details);
  }
  return parsed.data;
}

export const tokenStore = {
  read: readTokens,
  write: writeTokens,
  subscribe: subscribeTokens,
};

export type Me = AuthUserView;
export const fetchMe = (): Promise<Me> => apiFetch<Me>('/auth/me');

/**
 * Ends the session everywhere: revokes the refresh token server-side (so it
 * can't be used to mint new access tokens) and clears the local JWTs. The
 * server call is best-effort — local tokens are cleared regardless so the UI
 * never appears "still logged in" after a logout.
 */
export async function logout(): Promise<void> {
  const tokens = readTokens();
  if (tokens?.refreshToken) {
    try {
      await apiFetch<null>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
    } catch {
      // Ignore — we still clear local state below.
    }
  }
  writeTokens(null);
}
