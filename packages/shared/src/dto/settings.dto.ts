import { z } from 'zod';

// ---------------------------------------------------------------------------
// Footer configuration
//
// The whole footer is admin-editable and stored as JSON under the `footer`
// key of SiteSetting. A footer is an ordered list of columns (each column has
// a `type` that decides which fields are rendered), a grid width, and a bottom
// bar. Fields are kept optional/defaulted so switching a column's type in the
// editor never produces an invalid document.
// ---------------------------------------------------------------------------

export const LinkTarget = z.enum(['_self', '_blank']);
export type LinkTarget = z.infer<typeof LinkTarget>;

export const FooterLink = z.object({
  label: z.string().min(1, 'Label is required').max(80),
  url: z.string().min(1, 'URL is required').max(500),
  target: LinkTarget.default('_self'),
});
export type FooterLink = z.infer<typeof FooterLink>;

export const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'twitter',
  'youtube',
  'linkedin',
  'website',
] as const;
export const SocialPlatform = z.enum(SOCIAL_PLATFORMS);
export type SocialPlatform = z.infer<typeof SocialPlatform>;

export const SocialLink = z.object({
  platform: SocialPlatform,
  url: z.string().min(1, 'URL is required').max(500),
});
export type SocialLink = z.infer<typeof SocialLink>;

export const FOOTER_COLUMN_TYPES = ['links', 'text', 'contact', 'social', 'brand'] as const;
export const FooterColumnType = z.enum(FOOTER_COLUMN_TYPES);
export type FooterColumnType = z.infer<typeof FooterColumnType>;

/**
 * A single footer column. `type` selects which of the field groups below is
 * rendered; the others are ignored (but preserved) so the editor can flip
 * types without data loss.
 */
export const FooterColumn = z.object({
  /** Stable client-side key for list rendering / reordering. */
  id: z.string().min(1).max(64),
  type: FooterColumnType.default('links'),
  title: z.string().max(80).default(''),

  // type: 'links'
  links: z.array(FooterLink).max(30).default([]),

  // type: 'text'
  text: z.string().max(2000).default(''),

  // type: 'contact'
  phone: z.string().max(60).default(''),
  email: z.string().max(160).default(''),
  address: z.string().max(300).default(''),

  // type: 'social'
  socials: z.array(SocialLink).max(12).default([]),

  // type: 'brand'
  brandName: z.string().max(80).default(''),
  brandTagline: z.string().max(400).default(''),
  showNewsletter: z.boolean().default(false),
  newsletterDiscountCode: z.string().max(40).default(''),
});
export type FooterColumn = z.infer<typeof FooterColumn>;

export const FooterConfig = z.object({
  /** How many columns per row on desktop (1–6). Grid wraps below that. */
  columnsPerRow: z.coerce.number().int().min(1).max(6).default(4),
  columns: z.array(FooterColumn).max(12).default([]),
  bottom: z
    .object({
      /** `{year}` is replaced with the current year at render time. */
      copyright: z.string().max(300).default('© {year} Ecom. All rights reserved.'),
      links: z.array(FooterLink).max(12).default([]),
    })
    .default({}),
});
export type FooterConfig = z.infer<typeof FooterConfig>;

/** Body of `PUT /settings/footer`. */
export const UpdateFooterConfigDto = FooterConfig;
export type UpdateFooterConfigDto = z.infer<typeof UpdateFooterConfigDto>;

/** Baseline footer, mirrors the old hardcoded layout, used as the fallback. */
export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  columnsPerRow: 4,
  columns: [
    {
      id: 'brand',
      type: 'brand',
      title: '',
      links: [],
      text: '',
      phone: '',
      email: '',
      address: '',
      socials: [],
      brandName: 'Ecom',
      brandTagline: 'Curated products delivered fast, backed by a 30-day money-back guarantee.',
      showNewsletter: true,
      newsletterDiscountCode: 'WELCOME10',
    },
    {
      id: 'shop',
      type: 'links',
      title: 'Shop',
      links: [
        { label: 'All products', url: '/products', target: '_self' },
        { label: 'Categories', url: '/categories', target: '_self' },
      ],
      text: '',
      phone: '',
      email: '',
      address: '',
      socials: [],
      brandName: '',
      brandTagline: '',
      showNewsletter: false,
      newsletterDiscountCode: '',
    },
    {
      id: 'help',
      type: 'links',
      title: 'Help',
      links: [
        { label: 'Contact us', url: '/contact', target: '_self' },
        { label: 'Shipping', url: '/shipping', target: '_self' },
        { label: 'Refund policy', url: '/refund', target: '_self' },
      ],
      text: '',
      phone: '',
      email: '',
      address: '',
      socials: [],
      brandName: '',
      brandTagline: '',
      showNewsletter: false,
      newsletterDiscountCode: '',
    },
    {
      id: 'contact',
      type: 'contact',
      title: 'Get in touch',
      links: [],
      text: '',
      phone: '+84 900 000 000',
      email: 'hello@ecom.local',
      address: 'Ho Chi Minh City, Vietnam',
      socials: [
        { platform: 'facebook', url: 'https://facebook.com' },
        { platform: 'instagram', url: 'https://instagram.com' },
        { platform: 'twitter', url: 'https://twitter.com' },
        { platform: 'youtube', url: 'https://youtube.com' },
      ],
      brandName: '',
      brandTagline: '',
      showNewsletter: false,
      newsletterDiscountCode: '',
    },
  ],
  bottom: {
    copyright: '© {year} Ecom. All rights reserved.',
    links: [
      { label: 'Terms', url: '/terms', target: '_self' },
      { label: 'Privacy', url: '/privacy', target: '_self' },
      { label: 'Refund policy', url: '/refund', target: '_self' },
      { label: 'Shipping', url: '/shipping', target: '_self' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Payment gateway settings
// ---------------------------------------------------------------------------

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), trimmed(max).optional());

export const PAYMENT_PROVIDER_KEYS = ['COD', 'MOMO', 'VNPAY', 'CREDIT_CARD'] as const;
export const PaymentProviderKey = z.enum(PAYMENT_PROVIDER_KEYS);
export type PaymentProviderKey = z.infer<typeof PaymentProviderKey>;

export const PaymentProviderConfig = z.object({
  key: PaymentProviderKey,
  name: trimmed(80).min(1).default(''),
  enabled: z.boolean().default(false),
  sandbox: z.boolean().default(true),
  merchantId: optionalText(160),
  apiKey: optionalText(300),
  secretKey: optionalText(300),
  webhookUrl: optionalText(500),
  description: optionalText(300),
});
export type PaymentProviderConfig = z.infer<typeof PaymentProviderConfig>;

export const PaymentSettingsConfig = z.object({
  currency: trimmed(12).min(1).default('VND'),
  allowGuestCheckout: z.boolean().default(true),
  providers: z.array(PaymentProviderConfig).min(1).max(20).default([]),
});
export type PaymentSettingsConfig = z.infer<typeof PaymentSettingsConfig>;

export const UpdatePaymentSettingsDto = PaymentSettingsConfig;
export type UpdatePaymentSettingsDto = z.infer<typeof UpdatePaymentSettingsDto>;

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsConfig = {
  currency: 'VND',
  allowGuestCheckout: true,
  providers: [
    {
      key: 'COD',
      name: 'Cash on Delivery',
      enabled: true,
      sandbox: true,
      merchantId: undefined,
      apiKey: undefined,
      secretKey: undefined,
      webhookUrl: undefined,
      description: 'Thanh toan khi nhan hang.',
    },
    {
      key: 'MOMO',
      name: 'MoMo',
      enabled: false,
      sandbox: true,
      merchantId: undefined,
      apiKey: undefined,
      secretKey: undefined,
      webhookUrl: undefined,
      description: undefined,
    },
    {
      key: 'VNPAY',
      name: 'VNPAY',
      enabled: false,
      sandbox: true,
      merchantId: undefined,
      apiKey: undefined,
      secretKey: undefined,
      webhookUrl: undefined,
      description: undefined,
    },
    {
      key: 'CREDIT_CARD',
      name: 'Credit Card',
      enabled: false,
      sandbox: true,
      merchantId: undefined,
      apiKey: undefined,
      secretKey: undefined,
      webhookUrl: undefined,
      description: undefined,
    },
  ],
};

// ---------------------------------------------------------------------------
// Shipping settings
// ---------------------------------------------------------------------------

export const SHIPPING_PROVIDER_KEYS = [
  'GHN',
  'GHTK',
  'VIETTEL_POST',
  'VNPOST',
  'MANUAL',
] as const;
export const ShippingProviderKey = z.enum(SHIPPING_PROVIDER_KEYS);
export type ShippingProviderKey = z.infer<typeof ShippingProviderKey>;

export const ShippingProviderConfig = z.object({
  key: ShippingProviderKey,
  name: trimmed(80).min(1).default(''),
  enabled: z.boolean().default(false),
  token: optionalText(300),
  apiBaseUrl: optionalText(300),
  shopId: optionalText(160),
  pickupName: optionalText(120),
  pickupPhone: optionalText(40),
  pickupAddress: optionalText(300),
  pickupWardCode: optionalText(80),
  pickupDistrictCode: optionalText(80),
  pickupProvinceCode: optionalText(80),
  leadTimeWebhookUrl: optionalText(500),
  notes: optionalText(400),
});
export type ShippingProviderConfig = z.infer<typeof ShippingProviderConfig>;

export const ShippingSettingsConfig = z.object({
  defaultProvider: ShippingProviderKey.default('MANUAL'),
  freeShippingThreshold: optionalText(40),
  flatRate: optionalText(40),
  providers: z.array(ShippingProviderConfig).min(1).max(30).default([]),
});
export type ShippingSettingsConfig = z.infer<typeof ShippingSettingsConfig>;

export const UpdateShippingSettingsDto = ShippingSettingsConfig;
export type UpdateShippingSettingsDto = z.infer<typeof UpdateShippingSettingsDto>;

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettingsConfig = {
  defaultProvider: 'MANUAL',
  freeShippingThreshold: undefined,
  flatRate: '30000',
  providers: [
    {
      key: 'MANUAL',
      name: 'Van chuyen thu cong',
      enabled: true,
      token: undefined,
      apiBaseUrl: undefined,
      shopId: undefined,
      pickupName: undefined,
      pickupPhone: undefined,
      pickupAddress: undefined,
      pickupWardCode: undefined,
      pickupDistrictCode: undefined,
      pickupProvinceCode: undefined,
      leadTimeWebhookUrl: undefined,
      notes: 'Dung khi chua ket noi API don vi van chuyen.',
    },
    {
      key: 'GHN',
      name: 'Giao Hang Nhanh (GHN)',
      enabled: false,
      token: undefined,
      apiBaseUrl: undefined,
      shopId: undefined,
      pickupName: undefined,
      pickupPhone: undefined,
      pickupAddress: undefined,
      pickupWardCode: undefined,
      pickupDistrictCode: undefined,
      pickupProvinceCode: undefined,
      leadTimeWebhookUrl: undefined,
      notes: undefined,
    },
    {
      key: 'GHTK',
      name: 'Giao Hang Tiet Kiem (GHTK)',
      enabled: false,
      token: undefined,
      apiBaseUrl: undefined,
      shopId: undefined,
      pickupName: undefined,
      pickupPhone: undefined,
      pickupAddress: undefined,
      pickupWardCode: undefined,
      pickupDistrictCode: undefined,
      pickupProvinceCode: undefined,
      leadTimeWebhookUrl: undefined,
      notes: undefined,
    },
    {
      key: 'VIETTEL_POST',
      name: 'Viettel Post',
      enabled: false,
      token: undefined,
      apiBaseUrl: undefined,
      shopId: undefined,
      pickupName: undefined,
      pickupPhone: undefined,
      pickupAddress: undefined,
      pickupWardCode: undefined,
      pickupDistrictCode: undefined,
      pickupProvinceCode: undefined,
      leadTimeWebhookUrl: undefined,
      notes: undefined,
    },
    {
      key: 'VNPOST',
      name: 'VNPost',
      enabled: false,
      token: undefined,
      apiBaseUrl: undefined,
      shopId: undefined,
      pickupName: undefined,
      pickupPhone: undefined,
      pickupAddress: undefined,
      pickupWardCode: undefined,
      pickupDistrictCode: undefined,
      pickupProvinceCode: undefined,
      leadTimeWebhookUrl: undefined,
      notes: undefined,
    },
  ],
};

// ---------------------------------------------------------------------------
// General store settings
// ---------------------------------------------------------------------------

export const GeneralSettingsConfig = z.object({
  storeName: trimmed(120).min(1).default('Ecom'),
  legalName: optionalText(160),
  taxCode: optionalText(80),
  supportEmail: z.string().trim().email().max(160).default('hello@ecom.local'),
  supportPhone: optionalText(40),
  address: optionalText(300),
  timezone: trimmed(80).default('Asia/Ho_Chi_Minh'),
  defaultLanguage: trimmed(20).default('vi'),
  defaultCurrency: trimmed(12).default('VND'),
  maintenanceMode: z.boolean().default(false),
  allowRegistration: z.boolean().default(true),
  orderAutoConfirmMinutes: z.coerce.number().int().min(0).max(10080).default(0),
});
export type GeneralSettingsConfig = z.infer<typeof GeneralSettingsConfig>;

export const UpdateGeneralSettingsDto = GeneralSettingsConfig;
export type UpdateGeneralSettingsDto = z.infer<typeof UpdateGeneralSettingsDto>;

export const DEFAULT_GENERAL_SETTINGS: GeneralSettingsConfig = {
  storeName: 'Ecom',
  legalName: undefined,
  taxCode: undefined,
  supportEmail: 'hello@ecom.local',
  supportPhone: undefined,
  address: undefined,
  timezone: 'Asia/Ho_Chi_Minh',
  defaultLanguage: 'vi',
  defaultCurrency: 'VND',
  maintenanceMode: false,
  allowRegistration: true,
  orderAutoConfirmMinutes: 0,
};
