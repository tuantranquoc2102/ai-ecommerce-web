import {
  Prisma,
  PrismaClient,
  ProductStatus,
  ProductType,
  DigitalType,
  CouponType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  CustomerGroupType,
  ReviewStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seeds realistic EXAMPLE order-management data for admin/dashboard testing.
 *
 * Self-contained and re-runnable: it upserts its own categories, products,
 * customers and coupons (so it works on a fresh DB), then wipes and recreates
 * a fixed set of `SEED-####` orders. Orders are spread across every
 * `OrderStatus` so each admin screen (list, filters, detail timeline, refunds)
 * has data to render.
 *
 * Money always uses `Prisma.Decimal`, mirroring the API's order-totals math
 * (subtotal = Σ lineTotal; total = subtotal + shippingFee − discountAmount +
 * taxAmount). See apps/api/src/modules/orders/order-totals.ts.
 *
 * Images reuse the picsum convention from seed-products.ts — deterministic
 * placeholders, no upload required.
 */

const SEED_ORDER_PREFIX = 'SEED-';
const SHIPPING_FEE = new Prisma.Decimal(30_000);

// ---------------------------------------------------------------------------
// Static seed definitions
// ---------------------------------------------------------------------------

interface CategorySeed {
  slug: string;
  name: string;
  description: string;
}

const CATEGORIES: CategorySeed[] = [
  { slug: 'electronics', name: 'Electronics', description: 'Gadgets, accessories and devices.' },
  { slug: 'books', name: 'Books', description: 'Print and digital titles.' },
  { slug: 'software', name: 'Software', description: 'Licences and digital downloads.' },
];

interface ProductSeed {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  type: ProductType;
  digitalType?: DigitalType;
  /** Base price in VND (integer). */
  basePrice: number;
}

const PRODUCTS: ProductSeed[] = [
  {
    slug: 'seed-wireless-headphones',
    title: 'Wireless Noise-Cancelling Headphones',
    description: 'Over-ear Bluetooth headphones with active noise cancellation.',
    categorySlug: 'electronics',
    type: ProductType.PHYSICAL,
    basePrice: 1_200_000,
  },
  {
    slug: 'seed-smart-watch',
    title: 'Smart Fitness Watch',
    description: 'AMOLED fitness watch with GPS and heart-rate tracking.',
    categorySlug: 'electronics',
    type: ProductType.PHYSICAL,
    basePrice: 2_500_000,
  },
  {
    slug: 'seed-usb-c-charger',
    title: '65W USB-C Fast Charger',
    description: 'Compact GaN charger with a single USB-C output.',
    categorySlug: 'electronics',
    type: ProductType.PHYSICAL,
    basePrice: 490_000,
  },
  {
    slug: 'seed-clean-code-book',
    title: 'Clean Code (Paperback)',
    description: 'A handbook of agile software craftsmanship.',
    categorySlug: 'books',
    type: ProductType.PHYSICAL,
    basePrice: 350_000,
  },
  {
    slug: 'seed-pragmatic-programmer',
    title: 'The Pragmatic Programmer',
    description: 'Your journey to mastery, 20th anniversary edition.',
    categorySlug: 'books',
    type: ProductType.PHYSICAL,
    basePrice: 420_000,
  },
  {
    slug: 'seed-design-patterns-ebook',
    title: 'Design Patterns (eBook)',
    description: 'Elements of reusable object-oriented software — PDF download.',
    categorySlug: 'books',
    type: ProductType.DIGITAL,
    digitalType: DigitalType.FILE_DOWNLOAD,
    basePrice: 250_000,
  },
  {
    slug: 'seed-photo-editor-license',
    title: 'PhotoEditor Pro License',
    description: 'Perpetual desktop licence delivered as a serial key.',
    categorySlug: 'software',
    type: ProductType.DIGITAL,
    digitalType: DigitalType.SERIAL_KEY,
    basePrice: 990_000,
  },
  {
    slug: 'seed-antivirus-1yr',
    title: 'Antivirus 1-Year License',
    description: 'One-year subscription key for up to 3 devices.',
    categorySlug: 'software',
    type: ProductType.DIGITAL,
    digitalType: DigitalType.SERIAL_KEY,
    basePrice: 590_000,
  },
];

interface CustomerSeed {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const CUSTOMERS: CustomerSeed[] = [
  { email: 'customer1@example.com', firstName: 'An', lastName: 'Nguyễn Văn', phone: '0901000001' },
  { email: 'customer2@example.com', firstName: 'Bình', lastName: 'Trần Thị', phone: '0901000002' },
  { email: 'customer3@example.com', firstName: 'Cường', lastName: 'Lê Hoàng', phone: '0901000003' },
  { email: 'customer4@example.com', firstName: 'Dung', lastName: 'Phạm Thị', phone: '0901000004' },
  { email: 'customer5@example.com', firstName: 'Đức', lastName: 'Võ Minh', phone: '0901000005' },
  { email: 'customer6@example.com', firstName: 'Hà', lastName: 'Đặng Thu', phone: '0901000006' },
  { email: 'customer7@example.com', firstName: 'Huy', lastName: 'Bùi Quốc', phone: '0901000007' },
  { email: 'customer8@example.com', firstName: 'Lan', lastName: 'Hồ Thị', phone: '0901000008' },
];

const CUSTOMER_PASSWORD = 'Customer!123';

interface CouponSeed {
  code: string;
  description: string;
  type: CouponType;
  value: number;
  maxDiscount?: number;
}

const COUPONS: CouponSeed[] = [
  {
    code: 'WELCOME10',
    description: '10% off your order (max 100k).',
    type: CouponType.PERCENTAGE,
    value: 10,
    maxDiscount: 100_000,
  },
  {
    code: 'FREESHIP',
    description: 'Free standard shipping.',
    type: CouponType.FREE_SHIPPING,
    value: 0,
  },
];

// Vietnamese shipping addresses, indexed per order for variety.
const ADDRESSES: Array<{ addressLine: string; ward: string; district: string; province: string }> = [
  { addressLine: '12 Nguyễn Huệ', ward: 'Phường Bến Nghé', district: 'Quận 1', province: 'TP. Hồ Chí Minh' },
  { addressLine: '45 Lê Lợi', ward: 'Phường Bến Thành', district: 'Quận 1', province: 'TP. Hồ Chí Minh' },
  { addressLine: '88 Trần Hưng Đạo', ward: 'Phường Cửa Nam', district: 'Quận Hoàn Kiếm', province: 'Hà Nội' },
  { addressLine: '23 Bạch Đằng', ward: 'Phường Thạch Thang', district: 'Quận Hải Châu', province: 'Đà Nẵng' },
  { addressLine: '150 Hai Bà Trưng', ward: 'Phường Đa Kao', district: 'Quận 1', province: 'TP. Hồ Chí Minh' },
  { addressLine: '9 Nguyễn Trãi', ward: 'Phường Thanh Xuân Trung', district: 'Quận Thanh Xuân', province: 'Hà Nội' },
];

// 20 orders spread across every status; several of each of the "happy path"
// statuses, plus 2 CANCELLED, 2 REFUNDED and 1 EXPIRED.
const STATUS_PLAN: OrderStatus[] = [
  OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.COMPLETED,
  OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.COMPLETED,
  OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.COMPLETED,
  OrderStatus.CANCELLED, OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.REFUNDED, OrderStatus.EXPIRED,
];

const CARRIERS = ['GHN', 'GHTK', 'Viettel Post'];
const PROVIDERS: PaymentProvider[] = [PaymentProvider.COD, PaymentProvider.VNPAY, PaymentProvider.MOMO];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic PRNG so re-runs generate stable line items. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickImages(slug: string): { mainImage: string; galleryImages: string[] } {
  const url = (n: number) => `https://picsum.photos/seed/${slug}-${n}/800/800`;
  return { mainImage: url(1), galleryImages: [url(1), url(2), url(3), url(4)] };
}

/** Full status lifecycle leading up to (and including) the target status. */
function lifecycle(target: OrderStatus): OrderStatus[] {
  switch (target) {
    case OrderStatus.PENDING:
      return [OrderStatus.PENDING];
    case OrderStatus.PAID:
      return [OrderStatus.PENDING, OrderStatus.PAID];
    case OrderStatus.PROCESSING:
      return [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING];
    case OrderStatus.SHIPPING:
      return [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPING];
    case OrderStatus.COMPLETED:
      return [
        OrderStatus.PENDING,
        OrderStatus.PAID,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPING,
        OrderStatus.COMPLETED,
      ];
    case OrderStatus.CANCELLED:
      return [OrderStatus.PENDING, OrderStatus.CANCELLED];
    case OrderStatus.EXPIRED:
      return [OrderStatus.PENDING, OrderStatus.EXPIRED];
    case OrderStatus.REFUNDED:
      return [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.REFUNDED];
  }
}

const TRANSITION_NOTES: Record<string, string> = {
  'null->PENDING': 'Order placed',
  'PENDING->PAID': 'Payment received',
  'PAID->PROCESSING': 'Order confirmed — preparing items',
  'PROCESSING->SHIPPING': 'Handed over to carrier',
  'SHIPPING->COMPLETED': 'Delivered to customer',
  'PENDING->CANCELLED': 'Cancelled by customer',
  'PENDING->EXPIRED': 'Payment window expired',
  'PROCESSING->REFUNDED': 'Refund issued to customer',
};

function noteFor(from: OrderStatus | null, to: OrderStatus): string {
  return TRANSITION_NOTES[`${from ?? 'null'}->${to}`] ?? `Status changed to ${to}`;
}

/** Mirrors order-totals.ts: subtotal + shippingFee − discount + tax. */
function computeMoney(
  lineTotals: Prisma.Decimal[],
  coupon: CouponSeed | null,
): {
  subtotal: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
} {
  const subtotal = lineTotals.reduce((acc, l) => acc.add(l), new Prisma.Decimal(0));
  let discountAmount = new Prisma.Decimal(0);
  let shippingFee = SHIPPING_FEE;

  if (coupon) {
    const value = new Prisma.Decimal(coupon.value);
    if (coupon.type === CouponType.PERCENTAGE) {
      discountAmount = subtotal.mul(value).div(100);
      if (coupon.maxDiscount != null) {
        const cap = new Prisma.Decimal(coupon.maxDiscount);
        if (discountAmount.gt(cap)) discountAmount = cap;
      }
    } else if (coupon.type === CouponType.FIXED_AMOUNT) {
      discountAmount = value.gt(subtotal) ? subtotal : value;
    } else if (coupon.type === CouponType.FREE_SHIPPING) {
      shippingFee = new Prisma.Decimal(0);
    }
  }

  const taxAmount = new Prisma.Decimal(0);
  const totalAmount = subtotal.sub(discountAmount).add(shippingFee).add(taxAmount);
  return {
    subtotal: round2(subtotal),
    shippingFee: round2(shippingFee),
    discountAmount: round2(discountAmount),
    taxAmount: round2(taxAmount),
    totalAmount: round2(totalAmount),
  };
}

function round2(d: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(d.toFixed(2));
}

/** Payment status implied by the order's current status. */
function paymentStatusFor(status: OrderStatus): PaymentStatus {
  switch (status) {
    case OrderStatus.PENDING:
      return PaymentStatus.PENDING;
    case OrderStatus.EXPIRED:
      return PaymentStatus.EXPIRED;
    case OrderStatus.CANCELLED:
      return PaymentStatus.FAILED;
    default:
      return PaymentStatus.SUCCEEDED;
  }
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function seedCategories(): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: { slug: c.slug, name: c.name, description: c.description },
    });
    bySlug.set(c.slug, row.id);
  }
  return bySlug;
}

interface SeededProduct {
  id: string;
  title: string;
  basePrice: Prisma.Decimal;
}

async function seedProducts(categoryIdBySlug: Map<string, string>): Promise<SeededProduct[]> {
  const out: SeededProduct[] = [];
  for (const p of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(p.categorySlug);
    if (!categoryId) throw new Error(`Missing category ${p.categorySlug} for product ${p.slug}`);

    const images = pickImages(p.slug);
    const basePrice = new Prisma.Decimal(p.basePrice);
    const data = {
      title: p.title,
      description: p.description,
      mainImage: images.mainImage,
      galleryImages: images.galleryImages as unknown as Prisma.InputJsonValue,
      type: p.type,
      digitalType: p.digitalType ?? null,
      basePrice,
      stockQuantity: 100,
      status: ProductStatus.ACTIVE,
    };

    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    let id: string;
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      await prisma.productCategory.deleteMany({ where: { productId: existing.id } });
      await prisma.productCategory.create({ data: { productId: existing.id, categoryId } });
      id = existing.id;
    } else {
      const created = await prisma.product.create({
        data: {
          slug: p.slug,
          ...data,
          productCategories: { create: [{ categoryId }] },
        },
      });
      id = created.id;
    }
    out.push({ id, title: p.title, basePrice });
  }
  return out;
}

async function seedCustomers(): Promise<string[]> {
  const customerRole = await prisma.role.upsert({
    where: { code: 'CUSTOMER' },
    update: {},
    create: {
      code: 'CUSTOMER',
      name: 'Customer',
      description: 'Default storefront user. No back-office permissions.',
      isSystem: true,
    },
  });

  const passwordHash = await bcrypt.hash(CUSTOMER_PASSWORD, 12);
  const ids: string[] = [];
  for (const c of CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: { firstName: c.firstName, lastName: c.lastName, status: 'ACTIVE' },
      create: {
        email: c.email,
        passwordHash,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: customerRole.id } },
      update: {},
      create: { userId: user.id, roleId: customerRole.id },
    });
    ids.push(user.id);
  }
  return ids;
}

async function seedCoupons(): Promise<Map<string, string>> {
  const byCode = new Map<string, string>();
  for (const c of COUPONS) {
    const row = await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        description: c.description,
        type: c.type,
        value: new Prisma.Decimal(c.value),
        maxDiscount: c.maxDiscount != null ? new Prisma.Decimal(c.maxDiscount) : null,
        isActive: true,
      },
      create: {
        code: c.code,
        description: c.description,
        type: c.type,
        value: new Prisma.Decimal(c.value),
        maxDiscount: c.maxDiscount != null ? new Prisma.Decimal(c.maxDiscount) : null,
        isActive: true,
      },
    });
    byCode.set(c.code, row.id);
  }
  return byCode;
}

const DAY_MS = 86_400_000;

async function seedOrders(
  products: SeededProduct[],
  customerIds: string[],
  couponByCode: Map<string, string>,
): Promise<number> {
  // Idempotent reset: cascades remove items/shipping/payments/history.
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: SEED_ORDER_PREFIX } } });

  const now = Date.now();
  let createdCount = 0;

  for (let i = 1; i <= STATUS_PLAN.length; i++) {
    const status = STATUS_PLAN[i - 1]!;
    const orderNumber = `${SEED_ORDER_PREFIX}${String(i).padStart(4, '0')}`;
    const rng = mulberry32(i * 9973);

    // Spread createdAt across the last ~30 days (1..20 days ago).
    const daysAgo = STATUS_PLAN.length - i + 1;
    const createdAt = new Date(now - daysAgo * DAY_MS);

    // 1–3 distinct product lines.
    const lineCount = 1 + Math.floor(rng() * 3);
    const chosen = new Set<number>();
    while (chosen.size < lineCount) chosen.add(Math.floor(rng() * products.length));

    const items = [...chosen].map((idx) => {
      const product = products[idx]!;
      const quantity = 1 + Math.floor(rng() * 3);
      const unitPrice = product.basePrice;
      const lineTotal = round2(unitPrice.mul(quantity));
      return {
        productId: product.id,
        titleSnapshot: product.title,
        unitPrice,
        quantity,
        lineTotal,
      };
    });

    // Attach a coupon to a few orders.
    let couponSeed: CouponSeed | null = null;
    let couponId: string | null = null;
    if (i % 5 === 3) {
      couponSeed = COUPONS[0]!; // WELCOME10
      couponId = couponByCode.get(couponSeed.code) ?? null;
    } else if (i % 5 === 0) {
      couponSeed = COUPONS[1]!; // FREESHIP
      couponId = couponByCode.get(couponSeed.code) ?? null;
    }

    const money = computeMoney(
      items.map((it) => it.lineTotal),
      couponSeed,
    );

    // Registered (even i) vs guest (odd i).
    const isRegistered = i % 2 === 0;
    const userId = isRegistered ? customerIds[i % customerIds.length]! : null;
    const contactEmail = isRegistered
      ? CUSTOMERS[i % CUSTOMERS.length]!.email
      : `guest${i}@example.com`;

    // Status lifecycle → history rows + derived timestamps.
    const seq = lifecycle(status);
    const stepAt = (k: number) => new Date(createdAt.getTime() + k * 2 * 3_600_000);
    const timeOf = (s: OrderStatus): Date | null => {
      const idx = seq.indexOf(s);
      return idx === -1 ? null : stepAt(idx);
    };

    const statusHistory = seq.map((to, k) => {
      const from = k === 0 ? null : seq[k - 1]!;
      return {
        fromStatus: from,
        toStatus: to,
        note: noteFor(from, to),
        createdAt: stepAt(k),
      };
    });

    const paidAt = timeOf(OrderStatus.PAID);
    const completedAt = timeOf(OrderStatus.COMPLETED);
    const cancelledAt = timeOf(OrderStatus.CANCELLED);
    const shippedAt = timeOf(OrderStatus.SHIPPING);
    const deliveredAt = timeOf(OrderStatus.COMPLETED);
    const refundedAt = timeOf(OrderStatus.REFUNDED);
    const isShippedState = status === OrderStatus.SHIPPING || status === OrderStatus.COMPLETED;

    const provider = PROVIDERS[i % PROVIDERS.length]!;
    const payStatus = paymentStatusFor(status);
    const payments: Prisma.PaymentUncheckedCreateWithoutOrderInput[] = [
      {
        provider,
        providerTxnId:
          provider === PaymentProvider.COD ? null : `SEED-TXN-${String(i).padStart(4, '0')}`,
        amount: money.totalAmount,
        currency: 'VND',
        status: payStatus,
        ipnReceivedAt: payStatus === PaymentStatus.SUCCEEDED ? (paidAt ?? createdAt) : null,
        createdAt,
      },
    ];

    // Refund bookkeeping: a second REFUNDED payment + order-level refund fields.
    let refundedAmount: Prisma.Decimal | null = null;
    let refundReason: string | null = null;
    if (status === OrderStatus.REFUNDED) {
      refundedAmount = money.totalAmount;
      refundReason = 'Customer requested refund — item not needed';
      payments.push({
        provider,
        providerTxnId: `SEED-REFUND-${String(i).padStart(4, '0')}`,
        amount: money.totalAmount,
        currency: 'VND',
        status: PaymentStatus.REFUNDED,
        ipnReceivedAt: refundedAt,
        createdAt: refundedAt ?? createdAt,
      });
    }

    const addr = ADDRESSES[i % ADDRESSES.length]!;
    const recipientName = isRegistered
      ? `${CUSTOMERS[i % CUSTOMERS.length]!.lastName} ${CUSTOMERS[i % CUSTOMERS.length]!.firstName}`
      : 'Khách vãng lai';
    const recipientPhone = isRegistered
      ? CUSTOMERS[i % CUSTOMERS.length]!.phone
      : `0902${String(100000 + i).slice(-6)}`;

    await prisma.order.create({
      data: {
        orderNumber,
        userId,
        contactEmail,
        status,
        subtotal: money.subtotal,
        shippingFee: money.shippingFee,
        discountAmount: money.discountAmount,
        taxAmount: money.taxAmount,
        totalAmount: money.totalAmount,
        currency: 'VND',
        couponId,
        notes: null,
        paidAt,
        completedAt,
        cancelledAt,
        refundedAmount,
        refundedAt,
        refundReason,
        createdAt,
        items: { create: items },
        shipping: {
          create: {
            recipientName,
            recipientPhone,
            addressLine: addr.addressLine,
            ward: addr.ward,
            district: addr.district,
            province: addr.province,
            countryCode: 'VN',
            carrier: isShippedState ? CARRIERS[i % CARRIERS.length]! : null,
            trackingCode: isShippedState ? `TRK${String(i).padStart(8, '0')}` : null,
            shippedAt: isShippedState ? shippedAt : null,
            deliveredAt: status === OrderStatus.COMPLETED ? deliveredAt : null,
          },
        },
        payments: { create: payments },
        statusHistory: { create: statusHistory },
      },
    });
    createdCount++;
  }

  return createdCount;
}

// ---------------------------------------------------------------------------
// Customer groups, reviews & internal notes
// ---------------------------------------------------------------------------

/** Order statuses that count as "paid" for spend/materialization purposes. */
const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPING,
  OrderStatus.COMPLETED,
];

const GROUP_SLUGS = ['vip-customers', 'high-spenders', 'newsletter'];

// High Spenders membership criteria (also persisted on the DYNAMIC group).
const HIGH_SPENDER_RULES = { minTotalSpent: 500_000, minOrderCount: 1 };

/**
 * Fixed review definitions so re-runs are stable. `p`/`c` index into the
 * seeded `products`/`customerIds` arrays; `verified` attaches the customer's
 * seeded order so the storefront shows a "verified purchase" badge; `reply`
 * (when present) is rendered as the store's admin response.
 */
interface ReviewSeed {
  p: number;
  c: number;
  rating: number;
  status: ReviewStatus;
  title: string;
  content: string;
  verified: boolean;
  reply?: string;
}

const REVIEWS: ReviewSeed[] = [
  { p: 0, c: 0, rating: 5, status: ReviewStatus.APPROVED, title: 'Chống ồn cực tốt', content: 'Đeo cả ngày làm việc rất thoải mái, âm bass chắc và sâu.', verified: true, reply: 'Cảm ơn bạn đã tin tưởng và ủng hộ shop!' },
  { p: 0, c: 3, rating: 4, status: ReviewStatus.APPROVED, title: 'Ổn trong tầm giá', content: 'Pin trâu, kết nối nhanh. Chỉ tiếc phần đệm tai hơi nóng.', verified: true },
  { p: 1, c: 1, rating: 5, status: ReviewStatus.APPROVED, title: 'Đồng hồ đáng tiền', content: 'GPS bắt nhanh, đo nhịp tim khá chính xác khi chạy bộ.', verified: true, reply: 'Rất vui vì sản phẩm phù hợp với bạn, chúc bạn tập luyện hiệu quả!' },
  { p: 1, c: 5, rating: 3, status: ReviewStatus.PENDING, title: 'Tạm được', content: 'Màn hình đẹp nhưng app đôi khi mất kết nối với điện thoại.', verified: false },
  { p: 2, c: 2, rating: 5, status: ReviewStatus.APPROVED, title: 'Nhỏ gọn, sạc nhanh', content: 'Sạc đầy laptop rất nhanh, mang đi công tác tiện lợi.', verified: true, reply: 'Cảm ơn đánh giá của bạn!' },
  { p: 2, c: 6, rating: 2, status: ReviewStatus.REJECTED, title: 'Không như mong đợi', content: 'Củ sạc nóng hơn tôi tưởng, review có nội dung quảng cáo bên thứ ba.', verified: false },
  { p: 3, c: 0, rating: 5, status: ReviewStatus.APPROVED, title: 'Sách kinh điển', content: 'Bản in đẹp, nội dung ai làm lập trình cũng nên đọc một lần.', verified: true },
  { p: 3, c: 4, rating: 4, status: ReviewStatus.PENDING, title: 'Nội dung hay', content: 'Giao hàng hơi lâu nhưng chất lượng sách thì miễn chê.', verified: true },
  { p: 4, c: 1, rating: 5, status: ReviewStatus.APPROVED, title: 'Must-read', content: 'Rất nhiều lời khuyên thực tế, đọc đi đọc lại vẫn thấm.', verified: false },
  { p: 4, c: 7, rating: 1, status: ReviewStatus.HIDDEN, title: 'Thất vọng', content: 'Bìa sách bị móp khi nhận, nội dung bình luận không phù hợp.', verified: true },
  { p: 5, c: 2, rating: 4, status: ReviewStatus.APPROVED, title: 'eBook tiện lợi', content: 'Tải về đọc ngay, định dạng PDF rõ ràng trên máy tính bảng.', verified: true },
  { p: 5, c: 3, rating: 3, status: ReviewStatus.PENDING, title: 'Bình thường', content: 'Nội dung tốt nhưng mong có thêm bản EPUB.', verified: false },
  { p: 6, c: 4, rating: 5, status: ReviewStatus.APPROVED, title: 'Key kích hoạt ngay', content: 'Nhận serial key qua email, kích hoạt phần mềm không lỗi.', verified: true },
  { p: 6, c: 5, rating: 4, status: ReviewStatus.HIDDEN, title: 'Tốt', content: 'Phần mềm chạy ổn, tạm ẩn để chờ kiểm duyệt nội dung.', verified: false },
  { p: 7, c: 6, rating: 2, status: ReviewStatus.REJECTED, title: 'Khó kích hoạt', content: 'Mất thời gian nhập key, review chứa thông tin liên hệ cá nhân.', verified: true },
];

async function seedGroupsReviewsNotes(
  products: SeededProduct[],
  customerIds: string[],
): Promise<{ groupCount: number; reviewCount: number }> {
  // --- Customer groups -----------------------------------------------------
  // Idempotent reset: removing the group cascades its members.
  await prisma.customerGroup.deleteMany({ where: { slug: { in: GROUP_SLUGS } } });

  // 1) VIP Customers — MANUAL, ~3 hand-picked members.
  const vipMembers = customerIds.slice(0, 3);
  await prisma.customerGroup.create({
    data: {
      name: 'VIP Customers',
      slug: 'vip-customers',
      description: 'Khách hàng thân thiết được ưu tiên chăm sóc.',
      color: '#f59e0b',
      type: CustomerGroupType.MANUAL,
      members: { create: vipMembers.map((userId) => ({ userId })) },
    },
  });

  // 2) High Spenders — DYNAMIC, membership materialized from paid-ish orders.
  const spendByUser = await prisma.order.groupBy({
    by: ['userId'],
    where: {
      orderNumber: { startsWith: SEED_ORDER_PREFIX },
      userId: { in: customerIds },
      status: { in: PAID_STATUSES },
    },
    _sum: { totalAmount: true },
    _count: { _all: true },
  });

  const minSpent = new Prisma.Decimal(HIGH_SPENDER_RULES.minTotalSpent);
  const highSpenderIds = spendByUser
    .filter(
      (g): g is typeof g & { userId: string } =>
        g.userId != null &&
        g._count._all >= HIGH_SPENDER_RULES.minOrderCount &&
        (g._sum.totalAmount ?? new Prisma.Decimal(0)).gte(minSpent),
    )
    .map((g) => g.userId);

  await prisma.customerGroup.create({
    data: {
      name: 'High Spenders',
      slug: 'high-spenders',
      description: 'Tự động: tổng chi tiêu và số đơn đạt ngưỡng.',
      color: '#22c55e',
      type: CustomerGroupType.DYNAMIC,
      rules: HIGH_SPENDER_RULES as Prisma.InputJsonValue,
      members: { create: highSpenderIds.map((userId) => ({ userId })) },
    },
  });

  // 3) Newsletter — MANUAL, ~5 members.
  const newsletterMembers = customerIds.slice(0, 5);
  await prisma.customerGroup.create({
    data: {
      name: 'Newsletter',
      slug: 'newsletter',
      description: 'Khách đã đăng ký nhận bản tin khuyến mãi.',
      color: '#3b82f6',
      type: CustomerGroupType.MANUAL,
      members: { create: newsletterMembers.map((userId) => ({ userId })) },
    },
  });

  const groupCount = 3;

  // --- Reviews -------------------------------------------------------------
  // Idempotent reset: drop any reviews attached to the seeded products.
  await prisma.review.deleteMany({ where: { product: { slug: { startsWith: 'seed-' } } } });

  // One seeded order per customer, used to mark reviews as verified purchases.
  const seededOrders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: SEED_ORDER_PREFIX }, userId: { in: customerIds } },
    select: { id: true, userId: true },
    orderBy: { orderNumber: 'asc' },
  });
  const orderIdByUser = new Map<string, string>();
  for (const o of seededOrders) {
    if (o.userId && !orderIdByUser.has(o.userId)) orderIdByUser.set(o.userId, o.id);
  }

  // Admin who "replied" to approved reviews (nice-to-have; field is free-text).
  const adminUser = await prisma.user.findFirst({
    where: { userRoles: { some: { role: { code: { in: ['SUPER_ADMIN', 'ADMIN'] } } } } },
    select: { id: true },
  });

  const now = Date.now();
  let reviewCount = 0;
  for (let i = 0; i < REVIEWS.length; i++) {
    const r = REVIEWS[i]!;
    const product = products[r.p];
    const userId = customerIds[r.c];
    if (!product || !userId) continue;

    const orderId = r.verified ? (orderIdByUser.get(userId) ?? null) : null;
    const createdAt = new Date(now - (REVIEWS.length - i) * DAY_MS);

    await prisma.review.create({
      data: {
        productId: product.id,
        userId,
        orderId,
        rating: r.rating,
        title: r.title,
        content: r.content,
        status: r.status,
        reply: r.reply ?? null,
        repliedAt: r.reply ? createdAt : null,
        repliedByUserId: r.reply ? (adminUser?.id ?? null) : null,
        createdAt,
      },
    });
    reviewCount++;
  }

  // --- Internal notes ------------------------------------------------------
  await prisma.user.update({
    where: { email: 'customer1@example.com' },
    data: { internalNote: 'VIP — ưu tiên hỗ trợ' },
  });
  await prisma.user.update({
    where: { email: 'customer2@example.com' },
    data: { internalNote: 'Đã từng khiếu nại đơn SEED-0002' },
  });

  return { groupCount, reviewCount };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding example order-management data…');

  const categoryIdBySlug = await seedCategories();
  const products = await seedProducts(categoryIdBySlug);
  const customerIds = await seedCustomers();
  const couponByCode = await seedCoupons();
  const orderCount = await seedOrders(products, customerIds, couponByCode);
  const { groupCount, reviewCount } = await seedGroupsReviewsNotes(products, customerIds);

  console.log('Done seeding orders.');
  console.log(
    `  Categories: ${CATEGORIES.length} | Products: ${products.length} | ` +
      `Customers: ${customerIds.length} | Coupons: ${couponByCode.size} | Orders: ${orderCount}`,
  );
  console.log(`  Customer groups: ${groupCount} | Reviews: ${reviewCount}`);
  console.log(`  Customer login password: ${CUSTOMER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
