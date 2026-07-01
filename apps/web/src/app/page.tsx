import Link from 'next/link';
import { ArrowRight, ShieldCheck, LayoutDashboard } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ecom/ui';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Ecom CMS</h1>
        <p className="text-muted-foreground">
          Headless CMS + e-commerce admin. Phase 1 + Module 1 scaffold is live.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <ShieldCheck className="size-5 text-primary" />
            <CardTitle className="mt-2">Sign in</CardTitle>
            <CardDescription>
              Use your admin credentials. TOTP 2FA is enforced for staff.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">
                Go to login <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <LayoutDashboard className="size-5 text-primary" />
            <CardTitle className="mt-2">Admin panel</CardTitle>
            <CardDescription>
              Requires a valid session. Permission-gated views and audit-logged actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/admin">
                Open admin <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        API expected at <code className="rounded bg-muted px-1.5 py-0.5">http://localhost:4000/api/v1</code>
      </p>
    </main>
  );
}
