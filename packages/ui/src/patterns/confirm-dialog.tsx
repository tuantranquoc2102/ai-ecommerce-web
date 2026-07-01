'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/alert-dialog';
import { buttonVariants } from '../components/button';
import { cn } from '../lib/cn';

interface ConfirmDialogProps {
  trigger: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the action button styles as destructive. */
  destructive?: boolean;
  /** Called when user confirms. May be async; loading state is handled. */
  onConfirm: () => void | Promise<void>;
}

/**
 * Standard confirm prompt. Use for any irreversible or destructive action
 * (delete, ban, force-logout, payout, etc).
 *
 *   <ConfirmDialog
 *     trigger={<Button variant="destructive">Delete</Button>}
 *     title="Delete this product?"
 *     description="This action cannot be undone."
 *     destructive
 *     onConfirm={() => deleteProduct(id)}
 *   />
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    try {
      setLoading(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className={cn(
              destructive &&
                buttonVariants({ variant: 'destructive' }),
            )}
          >
            {loading ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
