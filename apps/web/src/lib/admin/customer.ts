import type { UserStatus } from '@ecom/shared';

/** Admin user shape returned by `GET /users` and `GET /users/:id` (USER_SUMMARY_SELECT). */
export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  userRoles: { role: { id: string; code: string; name: string } }[];
  /** Admin-only internal annotation. Present on `GET /users/:id`. */
  internalNote?: string | null;
  /** Customer group memberships. Present on `GET /users/:id`. */
  groupMemberships?: {
    group: { id: string; name: string; color: string | null; type: string };
  }[];
}

export interface ListUsers {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export const USER_STATUS_VARIANT: Record<UserStatus, 'success' | 'destructive' | 'secondary'> = {
  ACTIVE: 'success',
  SUSPENDED: 'destructive',
  PENDING: 'secondary',
};

export function customerName(u: Pick<AdminUser, 'firstName' | 'lastName'>): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || '—';
}
