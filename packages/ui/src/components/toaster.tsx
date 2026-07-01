'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';

/**
 * Lightweight toast system. Wrap the app with <ToastProvider> in the root layout,
 * then call `useToast().toast({ title, description, variant })` from anywhere.
 *
 *   const { toast } = useToast();
 *   toast({ title: 'Saved', variant: 'success' });
 */

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning';

interface ToastOptions {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  duration?: number;
  action?: ReactNode;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive:
          'destructive group border-destructive bg-destructive text-destructive-foreground',
        success: 'border-success/40 bg-success/10 text-foreground',
        warning: 'border-warning/40 bg-warning/10 text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

type ToastEntry = Required<Pick<ToastOptions, 'id'>> & ToastOptions;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id?: string) => {
    setToasts((prev) => (id ? prev.filter((t) => t.id !== id) : []));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = options.id ?? Math.random().toString(36).slice(2, 10);
    setToasts((prev) => [...prev, { ...options, id }]);
    return id;
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.duration ?? 4000}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
            className={cn(
              toastVariants({ variant: t.variant ?? 'default' }),
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full',
              'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
              'data-[swipe=cancel]:translate-x-0',
              'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
            )}
          >
            <div className="grid gap-1">
              {t.title && (
                <ToastPrimitive.Title className="text-sm font-semibold">
                  {t.title}
                </ToastPrimitive.Title>
              )}
              {t.description && (
                <ToastPrimitive.Description className="text-sm opacity-90">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            {t.action}
            <ToastPrimitive.Close
              className={cn(
                'absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground',
                'focus:opacity-100 focus:outline-none focus:ring-1',
                'group-hover:opacity-100',
                'group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50',
              )}
              aria-label="Close"
            >
              <X className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport
          className={cn(
            'fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export const ToastAction = forwardRef<
  ElementRef<typeof ToastPrimitive.Action>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Action> &
    VariantProps<typeof toastVariants>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors',
      'hover:bg-secondary',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      'group-[.destructive]:border-destructive/30 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive/50',
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = 'ToastAction';
