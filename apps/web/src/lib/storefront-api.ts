import 'server-only';
import type {
  ApiResponse,
  CategoryTreeNode,
  MenuItem,
  MenuPosition,
  PageStatus,
} from '@ecom/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
const API_PREFIX = '/api/v1';

/**
 * Server-side fetch for public storefront endpoints. Runs on the Next.js
 * server (RSC), not the browser. Uses tag-based revalidation so admin edits
 * can invalidate storefront caches without waiting for TTL.
 */
async function serverFetch<T>(
  path: string,
  init: RequestInit & { revalidate?: number; tags?: string[] } = {},
): Promise<T | null> {
  const { revalidate = 60, tags, ...rest } = init;
  try {
    const res = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
      ...rest,
      headers: { 'content-type': 'application/json', ...rest.headers },
      next: { revalidate, tags },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const parsed = (await res.json()) as ApiResponse<T>;
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export interface PublicPage {
  id: string;
  title: string;
  slug: string;
  layoutJson: unknown;
  seoTitle: string | null;
  seoDesc: string | null;
  status: PageStatus;
  publishedAt: string | null;
}

export function getPageBySlug(slug: string) {
  return serverFetch<PublicPage>(`/pages/by-slug/${encodeURIComponent(slug)}`, {
    tags: ['pages', `page:${slug}`],
  });
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

export interface PublicMenu {
  id: string;
  name: string;
  position: MenuPosition;
  hierarchyJson: MenuItem[] | null;
}

export function getMenusByPosition(position: MenuPosition) {
  return serverFetch<PublicMenu[]>(
    `/menus/public/${position}`,
    { tags: ['menus', `menu:${position}`] },
  );
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export interface PublicBanner {
  id: string;
  position: string;
  imageUrl: string;
  targetUrl: string | null;
  altText: string | null;
  sortOrder: number;
}

export function getActiveBanners(position: string) {
  return serverFetch<PublicBanner[]>(
    `/banners/active/${encodeURIComponent(position)}`,
    { tags: ['banners', `banner:${position}`], revalidate: 30 },
  );
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface PublicProduct {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  mainImage: string | null;
  galleryImages: string[] | null;
  type: 'PHYSICAL' | 'DIGITAL';
  digitalType: 'FILE_DOWNLOAD' | 'SERIAL_KEY' | null;
  basePrice: string;
  salePrice: string | null;
  stockQuantity: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  productCategories: { category: { id: string; name: string; slug: string } }[];
  productTags: { tag: { id: string; name: string; slug: string } }[];
}

export interface PublicProductList {
  items: PublicProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export function listPublicProducts(params: {
  categoryId?: string;
  tagId?: string;
  search?: string;
  pageSize?: number;
  page?: number;
  sortBy?: 'createdAt' | 'title' | 'basePrice';
  sortDir?: 'asc' | 'desc';
} = {}) {
  const qs = new URLSearchParams();
  if (params.categoryId) qs.set('categoryId', params.categoryId);
  if (params.tagId) qs.set('tagId', params.tagId);
  if (params.search) qs.set('search', params.search);
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.page) qs.set('page', String(params.page));
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortDir) qs.set('sortDir', params.sortDir);
  return serverFetch<PublicProductList>(`/products/public/list?${qs.toString()}`, {
    tags: ['products'],
  });
}

export function getProductBySlug(slug: string) {
  return serverFetch<PublicProduct>(
    `/products/by-slug/${encodeURIComponent(slug)}`,
    { tags: ['products', `product:${slug}`] },
  );
}

/**
 * Public batch lookup by product IDs. Hits `/products/public/by-ids` (Public,
 * unlike the admin-gated `/products/:id`) and filters to ACTIVE + non-deleted.
 * Returns null slots for IDs the server didn't return, preserving caller-
 * specified order so ProductGrid manual mode + FlashSale render in the exact
 * sequence the editor picked. Placeholder ids like "REPLACE_1" are dropped
 * cleanly so pages with unfinished templates don't 500.
 */
export async function getProductsByIds(ids: string[]): Promise<Array<PublicProduct | null>> {
  const cleaned = Array.from(new Set(ids.filter((id) => id && !id.startsWith('REPLACE'))));
  if (cleaned.length === 0) return ids.map(() => null);

  const qs = encodeURIComponent(cleaned.join(','));
  const result = await serverFetch<PublicProduct[]>(`/products/public/by-ids?ids=${qs}`, {
    tags: ['products'],
  });
  const list = result ?? [];
  const byId = new Map(list.map((p) => [p.id, p] as const));
  return ids.map((id) => byId.get(id) ?? null);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function getCategoryTree() {
  return serverFetch<CategoryTreeNode[]>('/categories/public/tree', {
    tags: ['categories'],
  });
}

export interface PublicCategoryDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  _count: { productCategories: number; children: number };
  parent: { id: string; name: string; slug: string } | null;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    _count: { productCategories: number };
  }>;
}

export function getCategoryBySlug(slug: string) {
  return serverFetch<PublicCategoryDetail>(
    `/categories/by-slug/${encodeURIComponent(slug)}`,
    { tags: ['categories', `category:${slug}`] },
  );
}
