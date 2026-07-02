/**
 * Field schema registry — describes how each storefront block type should be
 * edited in the admin UI. The `PropertyEditor` component reads a schema and
 * dispatches to concrete form controls (text input, color picker, image
 * upload, link picker, repeatable array of sub-schemas, etc.).
 *
 * NOTE: schemas here are structural (edit UI) — they DO NOT replace runtime
 * validation. Block components still guard-check their own props at render.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'image'
  | 'link'
  | 'banner-position'
  | 'category-picker'
  | 'tag-picker'
  | 'product-picker'
  | 'array'
  | 'group';

export interface BaseField {
  key: string;
  label: string;
  description?: string;
  /** Field default value inserted when the block is created. */
  defaultValue?: unknown;
  /** Hide this field if the parent object's `showKey` is false. */
  showIfKey?: string;
}

export interface TextField extends BaseField {
  type: 'text';
  placeholder?: string;
  maxLength?: number;
}

export interface TextareaField extends BaseField {
  type: 'textarea';
  rows?: number;
  placeholder?: string;
}

export interface NumberField extends BaseField {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export interface BooleanField extends BaseField {
  type: 'boolean';
  /** When true, hides other fields keyed by this via `showIfKey`. */
}

export interface SelectField extends BaseField {
  type: 'select';
  options: Array<{ value: string; label: string }>;
}

export interface ColorField extends BaseField {
  type: 'color';
  presets?: string[];
}

export interface ImageField extends BaseField {
  type: 'image';
  folder?: 'products' | 'categories' | 'users' | 'banners' | 'posts';
}

export interface LinkField extends BaseField {
  type: 'link';
}

export interface BannerPositionField extends BaseField {
  type: 'banner-position';
  placeholder?: string;
}

export interface CategoryPickerField extends BaseField {
  type: 'category-picker';
}

export interface TagPickerField extends BaseField {
  type: 'tag-picker';
}

export interface ProductPickerField extends BaseField {
  type: 'product-picker';
  multiple?: boolean;
}

export interface ArrayField extends BaseField {
  type: 'array';
  /** Item schema fields — form rendered for each array entry. */
  itemFields: Field[];
  /** Human-readable label pattern for each collapsed item, e.g. "Slide {index}: {headline}". */
  itemSummary?: string;
  min?: number;
  max?: number;
  addLabel?: string;
}

export interface GroupField extends BaseField {
  type: 'group';
  fields: Field[];
}

export type Field =
  | TextField
  | TextareaField
  | NumberField
  | BooleanField
  | SelectField
  | ColorField
  | ImageField
  | LinkField
  | BannerPositionField
  | CategoryPickerField
  | TagPickerField
  | ProductPickerField
  | ArrayField
  | GroupField;

export interface BlockSchema {
  /** The `block.type` value used at render time — matches BlockRenderer switch. */
  blockType: string;
  /** Display name shown in template list, palette, canvas badge. */
  label: string;
  /** Short description shown in palette. */
  description: string;
  /** Optional Lucide icon name for the palette. */
  icon?: string;
  /** Fields users can edit. */
  fields: Field[];
}

// ---------------------------------------------------------------------------
// Sub-schema: text style (used inline for headline/subHeadline)
// ---------------------------------------------------------------------------

/** Fields for a single text overlay with show toggle + color + fontSize. */
function textStyleFields(labelPrefix: string, textKey: string): Field[] {
  return [
    {
      key: `${textKey}_show`,
      label: `Show ${labelPrefix.toLowerCase()}`,
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: textKey,
      label: `${labelPrefix} text`,
      type: 'text',
      showIfKey: `${textKey}_show`,
      defaultValue: '',
    },
    {
      key: `${textKey}_color`,
      label: `${labelPrefix} color`,
      type: 'color',
      description: 'Leave blank to inherit theme color.',
      showIfKey: `${textKey}_show`,
      defaultValue: '',
      presets: ['#ffffff', '#000000', '#f5f5f5', '#facc15', '#ef4444', '#22c55e'],
    },
    {
      key: `${textKey}_fontSize`,
      label: `${labelPrefix} font size`,
      type: 'select',
      description: 'Tailwind text size utility.',
      showIfKey: `${textKey}_show`,
      defaultValue: '',
      options: [
        { value: '', label: 'Default' },
        { value: 'text-sm', label: 'Small' },
        { value: 'text-base', label: 'Base' },
        { value: 'text-lg', label: 'Large' },
        { value: 'text-xl', label: 'Extra large' },
        { value: 'text-2xl', label: '2XL' },
        { value: 'text-3xl', label: '3XL' },
        { value: 'text-4xl', label: '4XL' },
        { value: 'text-5xl', label: '5XL (hero)' },
        { value: 'text-6xl', label: '6XL (hero)' },
      ],
    },
  ];
}

/** Fields for a CTA button (label + href, editor picks internal/external/page). */
function ctaFields(prefix = 'cta'): Field[] {
  return [
    {
      key: `${prefix}_show`,
      label: 'Show button',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: `${prefix}_label`,
      label: 'Button label',
      type: 'text',
      placeholder: 'e.g. Shop now, Read more, Click to buy',
      showIfKey: `${prefix}_show`,
      defaultValue: '',
      maxLength: 40,
    },
    {
      key: `${prefix}_href`,
      label: 'Button link',
      type: 'link',
      showIfKey: `${prefix}_show`,
      defaultValue: '',
    },
    {
      key: `${prefix}_variant`,
      label: 'Button style',
      type: 'select',
      showIfKey: `${prefix}_show`,
      defaultValue: 'default',
      options: [
        { value: 'default', label: 'Primary (filled)' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'outline', label: 'Outline' },
        { value: 'ghost', label: 'Ghost (transparent)' },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Block schema registry
// ---------------------------------------------------------------------------

const HERO_BANNER: BlockSchema = {
  blockType: 'HeroBanner',
  label: 'Hero Banner',
  description: 'Full-bleed image at the top of a page with overlay text + CTA.',
  icon: 'Image',
  fields: [
    {
      key: 'image',
      label: 'Background image',
      type: 'image',
      folder: 'banners',
      description: 'Uploaded to the media library.',
    },
    {
      key: 'bannerPosition',
      label: 'Or pull from banner slot',
      type: 'banner-position',
      description:
        'Alternative to a direct upload. Auto-refreshes when the banner in this slot changes.',
      defaultValue: '',
    },
    {
      key: 'align',
      label: 'Text alignment',
      type: 'select',
      defaultValue: 'center',
      options: [
        { value: 'center', label: 'Center' },
        { value: 'left', label: 'Left' },
      ],
    },
    {
      key: 'aspect',
      label: 'Aspect ratio',
      type: 'select',
      defaultValue: 'wide',
      options: [
        { value: 'wide', label: 'Wide (21:9)' },
        { value: 'square', label: 'Square-ish (16:9)' },
        { value: 'tall', label: 'Tall (3:4)' },
      ],
    },
    ...textStyleFields('Headline', 'headline'),
    ...textStyleFields('Sub-headline', 'subHeadline'),
    { key: 'cta_group', label: 'Primary CTA', type: 'group', fields: ctaFields('cta') },
    { key: 'cta2_group', label: 'Secondary CTA', type: 'group', fields: ctaFields('secondaryCta') },
  ],
};

const BANNER_SLIDER: BlockSchema = {
  blockType: 'BannerSlider',
  label: 'Banner Slider',
  description:
    'Auto-rotating slideshow. Configure each slide inline OR pull from a banner slot.',
  icon: 'ImagePlay',
  fields: [
    {
      key: 'autoPlayMs',
      label: 'Auto-play delay',
      type: 'number',
      min: 0,
      max: 30_000,
      step: 500,
      suffix: 'ms',
      defaultValue: 5000,
      description: 'Set to 0 to disable auto-play.',
    },
    { key: 'showDots', label: 'Show pagination dots', type: 'boolean', defaultValue: true },
    { key: 'showArrows', label: 'Show prev/next arrows', type: 'boolean', defaultValue: true },
    {
      key: 'bannerPosition',
      label: 'Or pull from banner slot',
      type: 'banner-position',
      description:
        'Alternative to inline slides. If left blank, uses the "slides" list below.',
      defaultValue: '',
    },
    {
      key: 'slides',
      label: 'Slides',
      type: 'array',
      addLabel: 'Add slide',
      itemSummary: 'Slide {index}: {headline}',
      min: 0,
      max: 12,
      itemFields: [
        {
          key: 'image',
          label: 'Slide image',
          type: 'image',
          folder: 'banners',
        },
        ...textStyleFields('Headline', 'headline'),
        ...textStyleFields('Sub-headline', 'subHeadline'),
        ...ctaFields('cta'),
      ],
    },
  ],
};

const PRODUCT_GRID: BlockSchema = {
  blockType: 'ProductGrid',
  label: 'Product Grid',
  description: 'Grid of product cards. Source products by category, tag, or manual selection.',
  icon: 'Grid3x3',
  fields: [
    { key: 'title', label: 'Section title', type: 'text', defaultValue: '' },
    { key: 'subtitle', label: 'Section subtitle', type: 'text', defaultValue: '' },
    {
      key: 'source',
      label: 'Data source',
      type: 'select',
      defaultValue: 'category',
      options: [
        { value: 'category', label: 'By category' },
        { value: 'tag', label: 'By tag' },
        { value: 'manual', label: 'Manual selection' },
      ],
    },
    {
      key: 'categoryId',
      label: 'Category',
      type: 'category-picker',
      showIfKey: 'source_is_category',
      defaultValue: '',
    },
    {
      key: 'tagId',
      label: 'Tag',
      type: 'tag-picker',
      showIfKey: 'source_is_tag',
      defaultValue: '',
    },
    {
      key: 'productIds',
      label: 'Manual products',
      type: 'product-picker',
      multiple: true,
      showIfKey: 'source_is_manual',
      defaultValue: [],
    },
    {
      key: 'limit',
      label: 'Max products',
      type: 'number',
      min: 1,
      max: 24,
      defaultValue: 8,
    },
    {
      key: 'columns',
      label: 'Columns',
      type: 'select',
      defaultValue: 4,
      options: [
        { value: '2', label: '2 columns' },
        { value: '3', label: '3 columns' },
        { value: '4', label: '4 columns' },
        { value: '5', label: '5 columns' },
      ],
    },
    { key: 'cardBadge', label: 'Card badge (optional)', type: 'text', defaultValue: '' },
  ],
};

const CATEGORY_LIST: BlockSchema = {
  blockType: 'CategoryList',
  label: 'Category List',
  description: 'Grid or list of category tiles for storefront navigation.',
  icon: 'FolderTree',
  fields: [
    { key: 'parentId', label: 'Parent category (blank = roots)', type: 'category-picker', defaultValue: '' },
    { key: 'limit', label: 'Max items', type: 'number', min: 1, max: 24, defaultValue: 6 },
    {
      key: 'layout',
      label: 'Layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { value: 'grid', label: 'Grid' },
        { value: 'list', label: 'List' },
      ],
    },
    { key: 'showImage', label: 'Show category image', type: 'boolean', defaultValue: true },
  ],
};

const RICH_TEXT: BlockSchema = {
  blockType: 'RichText',
  label: 'Rich Text',
  description: 'HTML content section — long-form copy, About us, article body.',
  icon: 'Type',
  fields: [
    { key: 'html', label: 'Content (HTML)', type: 'textarea', rows: 10, defaultValue: '' },
    {
      key: 'maxWidth',
      label: 'Max width',
      type: 'select',
      defaultValue: 'prose',
      options: [
        { value: 'prose', label: 'Prose (readable)' },
        { value: 'full', label: 'Full container' },
      ],
    },
  ],
};

const IMAGE_BLOCK: BlockSchema = {
  blockType: 'ImageBlock',
  label: 'Image',
  description: 'Single image with optional caption + link.',
  icon: 'Image',
  fields: [
    { key: 'url', label: 'Image', type: 'image', folder: 'posts' },
    { key: 'alt', label: 'Alt text', type: 'text', defaultValue: '' },
    { key: 'caption', label: 'Caption', type: 'text', defaultValue: '' },
    { key: 'href', label: 'Link target (optional)', type: 'link', defaultValue: '' },
    {
      key: 'maxWidth',
      label: 'Max width',
      type: 'select',
      defaultValue: 'container',
      options: [
        { value: 'container', label: 'Container' },
        { value: 'prose', label: 'Prose (narrower)' },
        { value: 'full-bleed', label: 'Full bleed' },
      ],
    },
  ],
};

const CTA_BUTTON: BlockSchema = {
  blockType: 'CTAButton',
  label: 'CTA Button',
  description: 'Prominent call-to-action, centered.',
  icon: 'MousePointerClick',
  fields: [
    { key: 'label', label: 'Button label', type: 'text', defaultValue: 'Shop now' },
    { key: 'href', label: 'Link target', type: 'link', defaultValue: '/products' },
    {
      key: 'variant',
      label: 'Style',
      type: 'select',
      defaultValue: 'default',
      options: [
        { value: 'default', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'outline', label: 'Outline' },
        { value: 'ghost', label: 'Ghost' },
      ],
    },
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      defaultValue: 'lg',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'sm', label: 'Small' },
        { value: 'lg', label: 'Large' },
      ],
    },
  ],
};

const TEXT_COLUMNS: BlockSchema = {
  blockType: 'TextColumns',
  label: 'Text Columns',
  description: 'Feature strip with 2-4 columns of icon + heading + body.',
  icon: 'LayoutGrid',
  fields: [
    {
      key: 'columns',
      label: 'Number of columns',
      type: 'select',
      defaultValue: 3,
      options: [
        { value: '2', label: '2 columns' },
        { value: '3', label: '3 columns' },
        { value: '4', label: '4 columns' },
      ],
    },
    {
      key: 'items',
      label: 'Columns',
      type: 'array',
      addLabel: 'Add column',
      itemSummary: 'Column {index}: {heading}',
      min: 1,
      max: 6,
      itemFields: [
        { key: 'icon', label: 'Icon name (Lucide)', type: 'text', defaultValue: '', placeholder: 'e.g. Truck, ShieldCheck' },
        { key: 'heading', label: 'Heading', type: 'text', defaultValue: '' },
        { key: 'body', label: 'Body', type: 'textarea', rows: 2, defaultValue: '' },
      ],
    },
  ],
};

const DIVIDER: BlockSchema = {
  blockType: 'Divider',
  label: 'Divider',
  description: 'Section separator with optional label.',
  icon: 'Minus',
  fields: [
    { key: 'label', label: 'Label (optional)', type: 'text', defaultValue: '' },
    {
      key: 'thickness',
      label: 'Thickness',
      type: 'select',
      defaultValue: 'thin',
      options: [
        { value: 'thin', label: 'Thin' },
        { value: 'thick', label: 'Thick' },
      ],
    },
  ],
};

const FAQ: BlockSchema = {
  blockType: 'FAQ',
  label: 'FAQ',
  description: 'Expandable list of questions and answers (accordion).',
  icon: 'HelpCircle',
  fields: [
    { key: 'title', label: 'Section title', type: 'text', defaultValue: 'Frequently asked questions' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: '' },
    {
      key: 'items',
      label: 'Questions',
      type: 'array',
      addLabel: 'Add question',
      itemSummary: 'Q: {question}',
      min: 1,
      max: 20,
      itemFields: [
        { key: 'question', label: 'Question', type: 'text', defaultValue: '' },
        { key: 'answer', label: 'Answer', type: 'textarea', rows: 3, defaultValue: '' },
      ],
    },
  ],
};

const TESTIMONIALS: BlockSchema = {
  blockType: 'Testimonials',
  label: 'Testimonials / UGC',
  description: 'Customer reviews with optional photos and star ratings.',
  icon: 'MessageCircleHeart',
  fields: [
    { key: 'title', label: 'Section title', type: 'text', defaultValue: 'Loved by shoppers' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: '' },
    {
      key: 'items',
      label: 'Testimonials',
      type: 'array',
      addLabel: 'Add testimonial',
      itemSummary: '{name}: "{quote}"',
      min: 1,
      max: 20,
      itemFields: [
        { key: 'name', label: 'Customer name', type: 'text', defaultValue: '' },
        { key: 'location', label: 'Location', type: 'text', defaultValue: '' },
        { key: 'quote', label: 'Quote', type: 'textarea', rows: 3, defaultValue: '' },
        { key: 'rating', label: 'Rating (1-5)', type: 'number', min: 1, max: 5, defaultValue: 5 },
        { key: 'avatarUrl', label: 'Avatar image', type: 'image', folder: 'users' },
        { key: 'photoUrl', label: 'UGC photo (product-in-context)', type: 'image', folder: 'users' },
      ],
    },
  ],
};

const TRUST_BADGES: BlockSchema = {
  blockType: 'TrustBadges',
  label: 'Trust Badges',
  description: 'Row of reassurance icons (free shipping, secure checkout, easy returns).',
  icon: 'BadgeCheck',
  fields: [
    {
      key: 'variant',
      label: 'Layout',
      type: 'select',
      defaultValue: 'strip',
      options: [
        { value: 'strip', label: 'Horizontal strip' },
        { value: 'grid', label: 'Grid cards' },
      ],
    },
    {
      key: 'items',
      label: 'Badges',
      type: 'array',
      addLabel: 'Add badge',
      itemSummary: '{title}',
      min: 2,
      max: 8,
      itemFields: [
        { key: 'icon', label: 'Icon name (Lucide)', type: 'text', defaultValue: '' },
        { key: 'title', label: 'Title', type: 'text', defaultValue: '' },
        { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: '' },
      ],
    },
  ],
};

const NEWSLETTER: BlockSchema = {
  blockType: 'Newsletter',
  label: 'Newsletter Signup',
  description: 'Email capture with discount code offer.',
  icon: 'Mail',
  fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Get 10% off your first order' },
    { key: 'subtitle', label: 'Subtitle', type: 'textarea', rows: 2, defaultValue: '' },
    { key: 'discountLabel', label: 'Discount label pill', type: 'text', defaultValue: '', placeholder: 'e.g. -10% OFF' },
    { key: 'discountCode', label: 'Discount code (sent on signup)', type: 'text', defaultValue: '' },
    {
      key: 'layout',
      label: 'Layout',
      type: 'select',
      defaultValue: 'boxed',
      options: [
        { value: 'boxed', label: 'Boxed card' },
        { value: 'inline', label: 'Inline (no background)' },
      ],
    },
  ],
};

const FLASH_SALE: BlockSchema = {
  blockType: 'FlashSaleCountdown',
  label: 'Flash Sale Countdown',
  description: 'Countdown timer to a deadline with attached product grid.',
  icon: 'Timer',
  fields: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: '⚡ Flash Sale' },
    { key: 'endAt', label: 'End at (ISO datetime)', type: 'text', placeholder: '2026-12-31T23:59:59.000Z', defaultValue: '' },
    { key: 'hideAfterEnd', label: 'Hide block after end', type: 'boolean', defaultValue: true },
    {
      key: 'productIds',
      label: 'Products in sale',
      type: 'product-picker',
      multiple: true,
      defaultValue: [],
    },
  ],
};

export const BLOCK_SCHEMAS: BlockSchema[] = [
  HERO_BANNER,
  BANNER_SLIDER,
  PRODUCT_GRID,
  CATEGORY_LIST,
  FLASH_SALE,
  TESTIMONIALS,
  TRUST_BADGES,
  NEWSLETTER,
  FAQ,
  RICH_TEXT,
  IMAGE_BLOCK,
  CTA_BUTTON,
  TEXT_COLUMNS,
  DIVIDER,
];

export function findBlockSchema(blockType: string): BlockSchema | null {
  return BLOCK_SCHEMAS.find((s) => s.blockType === blockType) ?? null;
}

/**
 * Walk a schema's fields and produce a default config object. Used when
 * creating a new block from a schema so the editor doesn't render with a
 * bunch of `undefined` values.
 */
export function buildDefaultConfig(schema: BlockSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const walk = (fields: Field[], target: Record<string, unknown>) => {
    for (const f of fields) {
      if (f.type === 'group') {
        walk(f.fields, target);
        continue;
      }
      if (f.type === 'array') {
        target[f.key] = f.defaultValue ?? [];
        continue;
      }
      target[f.key] = f.defaultValue ?? (f.type === 'boolean' ? false : '');
    }
  };
  walk(schema.fields, out);
  return out;
}
