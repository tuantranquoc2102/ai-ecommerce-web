'use client';

import { useEffect, useState } from 'react';
import { Key, ShieldCheck, UserRound } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  Skeleton,
} from '@ecom/ui';
import { fetchMe, type Me } from '@/lib/api-client';
import { PermissionGate } from '@/components/PermissionGate';

export default function AdminHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setMe)
      .catch((e: Error) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Auth required</AlertTitle>
        <AlertDescription>{err}</AlertDescription>
      </Alert>
    );
  }

  if (!me) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Welcome, ${me.firstName ?? me.email}`}
        description="Quick overview of your account and permissions."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <UserRound className="size-5 text-muted-foreground" />
            <CardTitle className="mt-2 text-base">Account</CardTitle>
            <CardDescription>{me.email}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="size-5 text-muted-foreground" />
            <CardTitle className="mt-2 text-base">Roles</CardTitle>
          </CardHeader>
          <CardContent>
            {me.roles.length === 0 ? (
              <span className="text-sm text-muted-foreground">No roles</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {me.roles.map((r) => (
                  <Badge key={r} variant="secondary">
                    {r}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Key className="size-5 text-muted-foreground" />
            <CardTitle className="mt-2 text-base">Permissions</CardTitle>
            <CardDescription>{me.permissions.length} granted</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <PermissionGate
        codes={['role.assign_permissions']}
        fallback={
          <Alert className="mt-8">
            <AlertTitle>Role admin section hidden</AlertTitle>
            <AlertDescription>
              You don't have <code>role.assign_permissions</code>.
            </AlertDescription>
          </Alert>
        }
      >
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Role permission matrix</CardTitle>
            <CardDescription>
              You have <code>role.assign_permissions</code>, so this block renders.
            </CardDescription>
          </CardHeader>
        </Card>
      </PermissionGate>
    </>
  );
}
