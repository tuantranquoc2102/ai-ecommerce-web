import { z } from 'zod';

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), schema);

const slug160 = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase kebab-case')
    .optional(),
);

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export const PageStatus = z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']);
export type PageStatus = z.infer<typeof PageStatus>;

/**
 * `layoutJson` is an opaque JSON blob the frontend widget parser interprets.
 * Shape convention (not enforced here so admins can iterate):
 *   { blocks: Array<{ id, type, props }> }
 */
export const LayoutJson = z.record(z.unknown()).or(z.array(z.unknown())).or(z.null());

export const CreatePageDto = z.object({
  title: z.string().min(1).max(200).trim(),
  slug: slug160,
  layoutJson: LayoutJson.default({ blocks: [] }),
  seoTitle: emptyToUndef(z.string().max(200).optional()),
  seoDesc: emptyToUndef(z.string().max(500).optional()),
  status: PageStatus.default('DRAFT'),
});
export type CreatePageDto = z.infer<typeof CreatePageDto>;

export const UpdatePageDto = CreatePageDto.partial();
export type UpdatePageDto = z.infer<typeof UpdatePageDto>;

export const ListPagesQuery = z.object({
  search: emptyToUndef(z.string().trim().max(200).optional()),
  status: emptyToUndef(PageStatus.optional()),
  // Keeps backward compatibility for existing callers that expect layoutJson.
  includeLayout: z.coerce.boolean().default(true),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
});
export type ListPagesQuery = z.infer<typeof ListPagesQuery>;

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

export const MenuPosition = z.enum(['HEADER', 'FOOTER', 'SIDEBAR']);
export type MenuPosition = z.infer<typeof MenuPosition>;

/**
 * Convention for menu items. `hierarchyJson` is an array of MenuItem.
 * The API stores it as opaque JSON; the frontend can validate stricter.
 */
export interface MenuItem {
  label: string;
  url: string;
  target?: '_self' | '_blank';
  /** Optional permission code — front-end hides item if user lacks it. */
  permissionCode?: string;
  children?: MenuItem[];
}

export const HierarchyJson = z.array(z.unknown()).or(z.null());

export const CreateMenuDto = z.object({
  name: z.string().min(1).max(120).trim(),
  position: MenuPosition,
  hierarchyJson: HierarchyJson.default([]),
});
export type CreateMenuDto = z.infer<typeof CreateMenuDto>;

export const UpdateMenuDto = CreateMenuDto.partial();
export type UpdateMenuDto = z.infer<typeof UpdateMenuDto>;

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

/**
 * `position` is a free-form string keyed by the storefront's layout — e.g.
 * "home_hero", "category_sidebar". Kept as string (not enum) so content
 * editors can add new slots without a code change.
 */
export const CreateBannerDto = z.object({
  position: z.string().min(1).max(80).trim(),
  imageUrl: z.string().url().max(500),
  targetUrl: emptyToUndef(z.string().url().max(500).optional()),
  altText: emptyToUndef(z.string().max(200).optional()),
  scheduleStart: emptyToUndef(z.coerce.date().optional()),
  scheduleEnd: emptyToUndef(z.coerce.date().optional()),
  isActive: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
});
export type CreateBannerDto = z.infer<typeof CreateBannerDto>;

export const UpdateBannerDto = CreateBannerDto.partial();
export type UpdateBannerDto = z.infer<typeof UpdateBannerDto>;

export const ListBannersQuery = z.object({
  position: emptyToUndef(z.string().trim().max(80).optional()),
  active: emptyToUndef(z.coerce.boolean().optional()),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
export type ListBannersQuery = z.infer<typeof ListBannersQuery>;
