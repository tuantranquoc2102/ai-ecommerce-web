'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  PageHeader,
  Separator,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';
import { OrdersTable } from '@/components/orders-table';
import { customerName, USER_STATUS_VARIANT, type AdminUser } from '@/lib/admin/customer';

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<AdminUser>(`/users/${id}`);
      setUser(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="p-5 lg:h-fit">
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
