'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CheckCircle2, Loader2, ShoppingBag, Truck, Wallet } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Separator,
  Textarea,
  cn,
  useToast,
} from '@ecom/ui';
import { CreateOrderDto, type PaymentProvider, type ValidateCouponResult } from '@ecom/shared';
import { ApiError } from '@/lib/api-client';
import { useCart } from '@/lib/cart/cart-context';
import { checkoutAsCustomer } from '@/lib/storefront/order-api';
import { validateCoupon } from '@/lib/storefront/coupon-api';
import { useCurrentCustomer } from '@/lib/storefront/current-user-hook';
import { formatVnd } from '@/lib/storefront/format';

const SHIPPING_FEE = 30_000;

const PROVIDER_OPTIONS: Array<{
  value: PaymentProvider;
  label: string;
  description: string;
  icon: typeof Wallet;
}> = [
  {
    value: 'COD',
    label: 'Cash on Delivery',
    description: 'Pay in cash when your order arrives.',
    icon: Truck,
  },
  {
    value: 'VNPAY',
    label: 'VNPAY',
    description: 'Bank cards and QR — pay online via VNPAY.',
    icon: Wallet,
  },
  {
    value: 'MOMO',
    label: 'MoMo',
    description: 'Pay with your MoMo e-wallet.',
    icon: Wallet,
  },
];

/**
 * Storefront checkout. Reads the client-side cart, collects contact +
 * shipping info, validates optional coupon, and posts to the backend. The
 * response tells us whether to redirect to a gateway (VNPAY/MoMo) or straight
 * to the confirmation page (COD). Cart is cleared only after a successful
 * response so a failed checkout doesn't strand the buyer with an empty cart.
 */
export default function CheckoutPage() {
  const cart = useCart();
  const { user, loading: userLoading } = useCurrentCustomer();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [coupon, setCoupon] = useState<ValidateCouponResult | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  // Redirect to /cart if the cart is empty (post-hydration).
  useEffect(() => {
    if (cart.hydrated && cart.items.length === 0) {
      router.replace('/cart');
    }
  }, [cart.hydrated, cart.items.length, router]);

  const form = useForm<CreateOrderDto>({
    resolver: zodResolver(CreateOrderDto),
    defaultValues: {
      items: [],
      shipping: {
        recipientName: '',
        recipientPhone: '',
        addressLine: '',
        ward: '',
        district: '',
        province: '',
        postalCode: '',
      },
      paymentProvider: 'COD',
      couponCode: '',
      notes: '',
      contactEmail: '',
    },
  });

  // Pre-fill contact info from the signed-in user once loaded.
  useEffect(() => {
    if (!userLoading && user) {
      form.setValue('contactEmail', user.email);
      if (user.firstName || user.lastName) {
        form.setValue(
          'shipping.recipientName',
          [user.firstName, user.lastName].filter(Boolean).join(' '),
        );
      }
    }
  }, [user, userLoading, form]);

  // Sync cart items into the form on every change so submission has the
  // latest state. Backend validates against product availability.
  useEffect(() => {
    form.setValue(
      'items',
      cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    );
  }, [cart.items, form]);

  const paymentProvider = form.watch('paymentProvider');
  const couponCode = form.watch('couponCode');

  // Debounced coupon validation. Runs after 500ms of no typing.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!couponCode?.trim()) {
      setCoupon(null);
      return;
    }
    setCouponChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await validateCoupon(couponCode.trim(), cart.subtotal);
        setCoupon(result);
      } catch {
        setCoupon(null);
      } finally {
        setCouponChecking(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [couponCode, cart.subtotal]);

  const totals = useMemo(() => {
    const subtotal = cart.subtotal;
    const discount = coupon?.valid ? Number(coupon.discountAmount) : 0;
    const shipping = coupon?.freeShipping ? 0 : SHIPPING_FEE;
    const total = Math.max(0, subtotal - discount) + shipping;
    return { subtotal, discount, shipping, total };
  }, [cart.subtotal, coupon]);

  async function onSubmit(values: CreateOrderDto) {
    if (cart.items.length === 0) {
      toast({ title: 'Your cart is empty', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await checkoutAsCustomer({
        ...values,
        couponCode: coupon?.valid ? values.couponCode : undefined,
      });
      cart.clear();
      if (result.redirectUrl) {
        // Gateway flow (VNPAY/MoMo). Full-page navigation to the bank.
        window.location.href = result.redirectUrl;
        return;
      }
      const qs = result.token ? `?token=${encodeURIComponent(result.token)}` : '';
      router.push(`/orders/${result.orderNumber}${qs}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
      toast({ title: 'Checkout failed', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart.hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <Link href="/cart" className="text-sm text-muted-foreground hover:text-foreground">
          Back to cart
        </Link>
      </div>

      {!user && !userLoading ? (
        <Alert className="mb-6">
          <AlertDescription className="text-xs">
            Checking out as a guest. <Link href="/account/login?next=/checkout" className="font-semibold underline">Sign in</Link> to save your address and see order history.
          </AlertDescription>
        </Alert>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="text-base font-semibold">Contact</h2>
              <Separator className="my-4" />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Email {user ? '' : <span className="text-destructive">*</span>}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" disabled={!!user} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipping.recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipping.recipientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input inputMode="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold">Shipping address</h2>
              <Separator className="my-4" />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="shipping.addressLine"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Street address <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipping.ward"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ward</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipping.district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipping.province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province / City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipping.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold">Payment method</h2>
              <Separator className="my-4" />
              <FormField
                control={form.control}
                name="paymentProvider"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid gap-3">
                      {PROVIDER_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const active = field.value === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={cn(
                              'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                              active
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'hover:bg-accent',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex size-8 items-center justify-center rounded-md bg-muted',
                                active && 'bg-primary text-primary-foreground',
                              )}
                            >
                              <Icon className="size-4" />
                            </span>
                            <span className="flex-1">
                              <span className="block text-sm font-semibold">{opt.label}</span>
                              <span className="block text-xs text-muted-foreground">
                                {opt.description}
                              </span>
                            </span>
                            {active ? <CheckCircle2 className="size-5 text-primary" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {paymentProvider !== 'COD' ? (
                <Alert className="mt-4">
                  <AlertDescription className="text-xs">
                    You'll be redirected to {paymentProvider} to complete your payment after placing the order.
                  </AlertDescription>
                </Alert>
              ) : null}
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold">Order notes</h2>
              <Separator className="my-4" />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Notes for your order</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Delivery instructions, gift note, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>
          </div>

          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <Card className="p-5">
              <h2 className="text-base font-semibold">Order summary</h2>
              <Separator className="my-4" />
              <ul className="space-y-3">
                {cart.items.map((item) => (
                  <li key={item.productId} className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.mainImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.mainImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ShoppingBag className="absolute inset-0 m-auto size-5 text-muted-foreground" />
                      )}
                      <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-xs font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatVnd(Number(item.unitPrice) * item.quantity)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <Separator className="my-4" />

              <FormField
                control={form.control}
                name="couponCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Coupon code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter code" {...field} />
                    </FormControl>
                    {couponChecking ? (
                      <p className="text-xs text-muted-foreground">Checking…</p>
                    ) : coupon ? (
                      coupon.valid ? (
                        <p className="text-xs text-emerald-600">
                          Coupon applied — {coupon.freeShipping ? 'free shipping' : `−${formatVnd(coupon.discountAmount)}`}
                        </p>
                      ) : (
                        <p className="text-xs text-destructive">{humanizeReason(coupon.reason)}</p>
                      )
                    ) : null}
                  </FormItem>
                )}
              />

              <Separator className="my-4" />

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-medium">{formatVnd(totals.subtotal)}</dd>
                </div>
                {totals.discount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="font-medium text-emerald-600">−{formatVnd(totals.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className={cn('font-medium', totals.shipping === 0 && 'text-emerald-600')}>
                    {totals.shipping === 0 ? 'Free' : formatVnd(totals.shipping)}
                  </dd>
                </div>
              </dl>

              <Separator className="my-4" />

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-semibold">{formatVnd(totals.total)}</span>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={submitting || cart.items.length === 0}
                className="mt-6 h-12 w-full text-base font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>Place order</>
                )}
              </Button>
            </Card>
          </aside>
        </form>
      </Form>
    </div>
  );
}

function humanizeReason(reason: string | null): string {
  switch (reason) {
    case 'COUPON_NOT_FOUND':
      return 'Coupon not found.';
    case 'COUPON_INACTIVE':
      return 'This coupon is inactive.';
    case 'COUPON_EXPIRED':
      return 'This coupon has expired.';
    case 'COUPON_NOT_STARTED':
      return 'This coupon is not active yet.';
    case 'COUPON_USAGE_LIMIT_REACHED':
      return 'This coupon has reached its usage limit.';
    case 'COUPON_MIN_ORDER_NOT_MET':
      return 'Order subtotal does not meet the minimum for this coupon.';
    default:
      return 'This coupon cannot be applied.';
  }
}
