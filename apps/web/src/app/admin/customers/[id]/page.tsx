'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, Loader2, LogOut } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Label,
  PageHeader,
  Separator,
  Textarea,
  useToast,
} from '@ecom/ui';
import type { CustomerStatsView } from '@ecom/shared';
import { ApiError, apiFetch } from '@/lib/api-client';
import { OrdersTable } from '@/components/orders-table';
import { customerName, USER_STATUS_VARIANT, type AdminUser } from '@/lib/admin/customer';
import { formatVnd } from '@/lib/storefront/format';

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<CustomerStatsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<AdminUser>(`/users/${id}`);
      setUser(result);
      setNote(result.internalNote ?? '');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadStats = useCallback(async () => {
    try {
      const result = await apiFetch<CustomerStatsView>(`/users/${id}/stats`);
      setStats(result);
    } catch {
      // Stats are supplementary — a failure shouldn't block the profile.
      setStats(null);
    }
  }, [id]);

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  async function setStatus(status: 'ACTIVE' | 'SUSPENDED') {
    setTogglingStatus(true);
    try {
      const result = await apiFetch<AdminUser>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setUser(result);
      toast({ title: `Customer ${status === 'ACTIVE' ? 'activated' : 'suspended'}`, variant: 'success' });
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setTogglingStatus(false);
    }
  }

  async function forceLogout() {
    setLoggingOut(true);
    try {
      const result = await apiFetch<{ count?: number }>(`/users/${id}/sessions`, {
        method: 'DELETE',
      });
      const count = result?.count ?? 0;
      toast({ title: `Signed out ${count} session${count === 1 ? '' : 's'}`, variant: 'success' });
    } catch (e) {
      toast({
        title: 'Force logout failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoggingOut(false);
    }
  }

  async function saveNote() {
    setSavingNote(true);
    try {
      const result = await apiFetch<AdminUser>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ internalNote: note }),
      });
      setUser(result);
      setNote(result.internalNote ?? '');
      toast({ title: 'Note saved', variant: 'success' });
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSavingNote(false);
    }
  }

  async function removeFromGroup(groupId: string) {
    try {
      await apiFetch<null>(`/customer-groups/${groupId}/members/${id}`, { method: 'DELETE' });
      toast({ title: 'Removed from group', variant: 'success' });
      await load();
    } catch (e) {
      toast({
        title: 'Remove failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading customer…
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/customers">
            <ArrowLeft className="size-4" />
            Back to customers
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error ?? 'Customer not found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const memberships = user.groupMemberships ?? [];

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/admin/customers">
          <ArrowLeft className="size-4" />
          Customers
        </Link>
      </Button>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span>{customerName(user)}</span>
            <Badge variant={USER_STATUS_VARIANT[user.status]}>{user.status}</Badge>
          </span>
        }
        description={user.email}
      />

      {/* Stats row */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total spent"
          value={stats ? formatVnd(stats.totalSpent) : '—'}
        />
        <StatCard
          label="Orders"
          value={stats ? String(stats.orderCount) : '—'}
          hint={stats ? `${stats.paidOrderCount} paid` : undefined}
        />
        <StatCard
          label="Avg order value"
          value={stats ? formatVnd(stats.avgOrderValue) : '—'}
        />
        <StatCard
          label="Last order"
          value={stats?.lastOrderAt ? new Date(stats.lastOrderAt).toLocaleDateString() : '—'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 lg:h-fit">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Profile</h2>
            <Separator className="my-3" />
            <dl className="space-y-3 text-sm">
              <Field label="Name" value={customerName(user)} />
              <Field label="Email" value={user.email} />
              {user.phone ? <Field label="Phone" value={user.phone} /> : null}
              <div>
                <dt className="text-muted-foreground">Roles</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {user.userRoles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    user.userRoles.map(({ role }) => (
                      <Badge key={role.id} variant="secondary" className="text-xs">
                        {role.name}
                      </Badge>
                    ))
                  )}
                </dd>
              </div>
              <Field label="Joined" value={new Date(user.createdAt).toLocaleString()} />
              {user.lastLoginAt ? (
                <Field label="Last login" value={new Date(user.lastLoginAt).toLocaleString()} />
              ) : null}
            </dl>
          </Card>

          {/* Groups panel */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Groups</h2>
            <Separator className="my-3" />
            {memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not a member of any group.</p>
            ) : (
              <ul className="space-y-2">
                {memberships.map(({ group }) => (
                  <li key={group.id} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className="size-3 shrink-0 rounded-full border"
                        style={{ backgroundColor: group.color ?? 'transparent' }}
                        aria-hidden
                      />
                      <Link
                        href={`/admin/customers/groups/${group.id}` as Route}
                        className="font-medium hover:underline"
                      >
                        {group.name}
                      </Link>
                      <Badge variant="secondary" className="text-[10px]">
                        {group.type}
                      </Badge>
                    </span>
                    {group.type === 'MANUAL' ? (
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="sm" className="h-7 text-destructive">
                            Remove
                          </Button>
                        }
                        title="Remove from group?"
                        description={`Remove this customer from "${group.name}".`}
                        destructive
                        confirmLabel="Remove"
                        onConfirm={() => removeFromGroup(group.id)}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Admin actions panel */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Admin actions</h2>
            <Separator className="my-3" />
            <div className="space-y-3">
              {user.status === 'ACTIVE' ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive" className="w-full" disabled={togglingStatus}>
                      {togglingStatus ? <Loader2 className="size-4 animate-spin" /> : null}
                      Suspend account
                    </Button>
                  }
                  title="Suspend this customer?"
                  description="They will be unable to sign in until reactivated."
                  destructive
                  confirmLabel="Suspend"
                  onConfirm={() => setStatus('SUSPENDED')}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button className="w-full" disabled={togglingStatus}>
                      {togglingStatus ? <Loader2 className="size-4 animate-spin" /> : null}
                      Activate account
                    </Button>
                  }
                  title="Activate this customer?"
                  description="They will regain the ability to sign in."
                  confirmLabel="Activate"
                  onConfirm={() => setStatus('ACTIVE')}
                />
              )}

              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="w-full" disabled={loggingOut}>
                    {loggingOut ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <LogOut className="size-4" />
                    )}
                    Force logout
                  </Button>
                }
                title="Force logout?"
                description="All active sessions for this customer will be revoked."
                confirmLabel="Force logout"
                onConfirm={forceLogout}
              />

              <div className="space-y-1 pt-1">
                <Label htmlFor="internal-note">Internal note</Label>
                <Textarea
                  id="internal-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Admin-only notes about this customer…"
                  rows={4}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={saveNote}
                    disabled={savingNote || note === (user.internalNote ?? '')}
                  >
                    {savingNote ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save note
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">Order history</h2>
          <Separator className="my-3" />
          <OrdersTable baseFilters={{ userId: id }} pageSize={50} showSearch={false} />
        </Card>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}
