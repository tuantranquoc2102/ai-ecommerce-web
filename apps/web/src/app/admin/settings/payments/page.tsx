'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { PaymentSettingsConfig, type PaymentSettingsConfig as PaymentSettingsValues } from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Separator,
  Skeleton,
  Switch,
  Textarea,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

export default function PaymentSettingsPage() {
  const { toast } = useToast();
  const [initial, setInitial] = useState<PaymentSettingsValues | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const form = useForm<PaymentSettingsValues>({
    resolver: zodResolver(PaymentSettingsConfig),
    defaultValues: initial ?? undefined,
  });

  useEffect(() => {
    apiFetch<PaymentSettingsValues>('/settings/payments')
      .then((data) => {
        setInitial(data);
        form.reset(data);
      })
      .catch((e: Error) => setErr(e.message));
  }, [form]);

  async function onSubmit(values: PaymentSettingsValues) {
    try {
      const saved = await apiFetch<PaymentSettingsValues>('/settings/payments', {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      form.reset(saved);
      toast({ title: 'Da luu cau hinh cong thanh toan', variant: 'success' });
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
        <PageHeader
          title="Cau hinh cong thanh toan"
          description="Quan ly ket noi va thong tin xac thuc cua tung cong thanh toan."
        />
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      </>
    );
  }

  if (!initial) {
    return (
      <>
        <PageHeader
          title="Cau hinh cong thanh toan"
          description="Quan ly ket noi va thong tin xac thuc cua tung cong thanh toan."
        />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      </>
    );
  }

  const providers = form.watch('providers');

  return (
    <>
      <PageHeader
        title="Cau hinh cong thanh toan"
        description="Quan ly ket noi va thong tin xac thuc cua tung cong thanh toan."
        actions={
          <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Dang luu...' : 'Luu thay doi'}
          </Button>
        }
      />

      {providers.length === 0 ? (
        <EmptyState
          icon={<CreditCard />}
          title="Chua co cong thanh toan nao"
          description="Them provider trong default settings de bat dau cau hinh."
        />
      ) : (
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Thong tin checkout</CardTitle>
                <CardDescription>Cau hinh chung ap dung cho toan bo cac cong thanh toan.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Don vi tien te</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="VND" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowGuestCheckout"
                  render={({ field }) => (
                    <FormItem className="flex h-full items-center justify-between rounded-md border px-4 py-2">
                      <div>
                        <FormLabel>Cho phep guest checkout</FormLabel>
                        <p className="text-xs text-muted-foreground">Khach khong can dang nhap van co the dat hang.</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {providers.map((provider, index) => (
              <Card key={provider.key}>
                <CardHeader>
                  <CardTitle>{provider.name || provider.key}</CardTitle>
                  <CardDescription>Thong tin ket noi cho provider {provider.key}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`providers.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ten hien thi</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`providers.${index}.merchantId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Merchant ID</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} placeholder="merchant id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`providers.${index}.apiKey`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} placeholder="api key" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`providers.${index}.secretKey`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secret Key</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} placeholder="secret key" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`providers.${index}.webhookUrl`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Webhook URL</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`providers.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Mo ta</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value ?? ''} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`providers.${index}.enabled`}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md border px-4 py-2">
                          <FormLabel>Kich hoat provider</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`providers.${index}.sandbox`}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md border px-4 py-2">
                          <FormLabel>Che do sandbox</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </form>
        </Form>
      )}
    </>
  );
}
