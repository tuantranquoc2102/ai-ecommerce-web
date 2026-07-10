'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ShippingSettingsConfig, type ShippingSettingsConfig as ShippingSettingsValues } from '@ecom/shared';
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
  Skeleton,
  Switch,
  Textarea,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

export default function ShippingSettingsPage() {
  const { toast } = useToast();
  const [initial, setInitial] = useState<ShippingSettingsValues | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const form = useForm<ShippingSettingsValues>({
    resolver: zodResolver(ShippingSettingsConfig),
    defaultValues: initial ?? undefined,
  });

  useEffect(() => {
    apiFetch<ShippingSettingsValues>('/settings/shipping')
      .then((data) => {
        setInitial(data);
        form.reset(data);
      })
      .catch((e: Error) => setErr(e.message));
  }, [form]);

  async function onSubmit(values: ShippingSettingsValues) {
    try {
      const saved = await apiFetch<ShippingSettingsValues>('/settings/shipping', {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      form.reset(saved);
      toast({ title: 'Da luu cau hinh van chuyen', variant: 'success' });
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
          title="Cau hinh don vi van chuyen"
          description="Quan ly ket noi API van chuyen va thong tin diem lay hang."
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
          title="Cau hinh don vi van chuyen"
          description="Quan ly ket noi API van chuyen va thong tin diem lay hang."
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
        title="Cau hinh don vi van chuyen"
        description="Quan ly ket noi API van chuyen va thong tin diem lay hang."
        actions={
          <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Dang luu...' : 'Luu thay doi'}
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Guide lay thong tin nha van chuyen</CardTitle>
          <CardDescription>Checklist nay giup team onboarding provider nhanh va dung truong du lieu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Dang ky tai khoan doanh nghiep voi provider (GHN/GHTK/ViettelPost/VNPost).</p>
          <p>2. Lay token API, shopId/merchantId va endpoint sandbox/production tu portal developer.</p>
          <p>3. Cau hinh diem lay hang chuan: pickupName, pickupPhone, pickupAddress, province/district/ward code.</p>
          <p>4. Cau hinh webhook thoi gian giao du kien va dong bo trang thai don hang.</p>
          <p>5. Goi thu API tinh phi va tao van don bang Postman truoc khi bat enabled.</p>
        </CardContent>
      </Card>

      {providers.length === 0 ? (
        <EmptyState
          icon={<Truck />}
          title="Chua co don vi van chuyen nao"
          description="Them provider trong default settings de bat dau cau hinh."
        />
      ) : (
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Thong so van chuyen chung</CardTitle>
                <CardDescription>Thong so fallback khi provider khong tra phi theo thoi gian thuc.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="defaultProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default provider key</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="freeShippingThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moc free ship (VND)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="VD: 500000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="flatRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phi co dinh fallback (VND)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="VD: 30000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {providers.map((provider, index) => (
              <Card key={provider.key}>
                <CardHeader>
                  <CardTitle>{provider.name || provider.key}</CardTitle>
                  <CardDescription>Thong tin ket noi API va diem lay hang cho {provider.key}.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
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
                    name={`providers.${index}.token`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API token</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} placeholder="token" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`providers.${index}.apiBaseUrl`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API base URL</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`providers.${index}.shopId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop ID</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`providers.${index}.leadTimeWebhookUrl`}
                    render={({ field }) => (
                      <FormItem>
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
                    name={`providers.${index}.pickupName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`providers.${index}.pickupPhone`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup phone</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`providers.${index}.pickupAddress`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Pickup address</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`providers.${index}.pickupProvinceCode`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province code</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`providers.${index}.pickupDistrictCode`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>District code</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`providers.${index}.pickupWardCode`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ward code</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`providers.${index}.notes`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Ghi chu</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ''} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ))}
          </form>
        </Form>
      )}
    </>
  );
}
