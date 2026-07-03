'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

/**
 * Client-side cart. Backed by localStorage so items survive page reloads,
 * with no server round-trip until checkout. When M3.3 lands (Orders + Cart
 * persistence), this store can either sync to the server on login or be
 * replaced by a server-first hook — the consumer API stays the same.
 *
 * SSR-safe:
 *   - Initial state on server + first client render is EMPTY.
 *   - `useEffect` on mount reads localStorage → sets state.
 *   - This means the header badge briefly shows "0" during hydration; that's
 *     preferable to hydration mismatch, and it renders correct within one
 *     paint.
 */

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  mainImage: string | null;
  /** Effective per-unit price (uses salePrice when present, else basePrice). */
  unitPrice: string;
  /** Original basePrice — kept so /cart can show strikethrough when discounted. */
  basePrice: string;
  quantity: number;
}

type Action =
  | { type: 'HYDRATE'; items: CartItem[] }
  | { type: 'ADD'; item: Omit<CartItem, 'quantity'>; quantity?: number }
  | { type: 'UPDATE_QTY'; productId: string; quantity: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'CLEAR' };

interface State {
  items: CartItem[];
}

const initialState: State = { items: [] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { items: action.items };
    case 'ADD': {
      const qty = Math.max(1, action.quantity ?? 1);
      const existing = state.items.find((i) => i.productId === action.item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === action.item.productId ? { ...i, quantity: i.quantity + qty } : i,
          ),
        };
      }
      return { items: [...state.items, { ...action.item, quantity: qty }] };
    }
    case 'UPDATE_QTY': {
      const qty = Math.max(0, action.quantity);
      if (qty === 0) return { items: state.items.filter((i) => i.productId !== action.productId) };
      return {
        items: state.items.map((i) =>
          i.productId === action.productId ? { ...i, quantity: qty } : i,
        ),
      };
    }
    case 'REMOVE':
      return { items: state.items.filter((i) => i.productId !== action.productId) };
    case 'CLEAR':
      return { items: [] };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  hydrated: boolean;
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  updateQty: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'ecom.cart.v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR/client divergence.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { items?: unknown };
        if (Array.isArray(parsed.items)) {
          dispatch({ type: 'HYDRATE', items: parsed.items as CartItem[] });
        }
      }
    } catch {
      // corrupt/absent — start with empty cart
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on every state change (post-hydration only, so
  // we don't wipe stored state with the empty SSR default on first render).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items }));
    } catch {
      // quota exceeded or blocked — best-effort, still works in-memory
    }
  }, [state.items, hydrated]);

  const add = useCallback(
    (item: Omit<CartItem, 'quantity'>, quantity?: number) =>
      dispatch({ type: 'ADD', item, quantity }),
    [],
  );
  const updateQty = useCallback(
    (productId: string, quantity: number) => dispatch({ type: 'UPDATE_QTY', productId, quantity }),
    [],
  );
  const remove = useCallback(
    (productId: string) => dispatch({ type: 'REMOVE', productId }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = state.items.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0,
    );
    return { items: state.items, itemCount, subtotal, hydrated, add, updateQty, remove, clear };
  }, [state.items, hydrated, add, updateQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
