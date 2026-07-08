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
