'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { GeneralSettingsConfig, type GeneralSettingsConfig as GeneralSettingsValues } from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Skeleton,
  Switch,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

export default function SettingsPage() {
  const { toast } = useToast();
  const [initial, setInitial] = useState<GeneralSettingsValues | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(GeneralSettingsConfig),
    defaultValues: initial ?? undefined,
  });

  useEffect(() => {
    apiFetch<GeneralSettingsValues>('/settings/general')
      .then((data) => {
        setInitial(data);
        form.reset(data);
      })
      .catch((e: Error) => setErr(e.message));
  }, [form]);

  async function onSubmit(values: GeneralSettingsValues) {
    try {
      const saved = await apiFetch<GeneralSettingsValues>('/settings/general', {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      form.reset(saved);
      toast({ title: 'Da luu cai dat chung', variant: 'success' });
    } catch (e) {
      toast({
        title: 'Luu that bai',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  if (err) {
    return (
      <>
        <PageHeader title="Cai dat chung" description="Thong tin cua hang va hanh vi van hanh mac dinh." />
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      </>
    );
  }

  if (!initial) {
    return (
      <>
        <PageHeader title="Cai dat chung" description="Thong tin cua hang va hanh vi van hanh mac dinh." />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Cai dat chung"
        description="Thong tin cua hang va hanh vi van hanh mac dinh."
        actions={
          <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Dang luu...' : 'Luu thay doi'}
          </Button>
        }
      />

      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Thong tin cua hang</CardTitle>
              <CardDescription>Du lieu hien thi tren hoa don, email va tai storefront.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ten cua hang</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ten phap ly</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ma so thue</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia chi</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supportEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email ho tro</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supportPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>So dien thoai ho tro</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Van hanh he thong</CardTitle>
              <CardDescription>Tham so anh huong den checkout, auth va ngon ngu hien thi.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time zone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngon ngu mac dinh</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tien te mac dinh</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orderAutoConfirmMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auto confirm don sau (phut)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border px-4 py-2">
                    <FormLabel>Maintenance mode</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowRegistration"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border px-4 py-2">
                    <FormLabel>Cho phep dang ky tai khoan</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </>
  );
}
