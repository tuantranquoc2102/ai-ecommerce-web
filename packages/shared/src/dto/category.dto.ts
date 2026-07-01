import { z } from 'zod';

const slug = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase kebab-case')
    .optional(),
);

// Empty strings from form inputs get coerced to undefined so that
// "optional" fields don't fail regex/URL validation on blank submits.
const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), schema);

export const CreateCategoryDto = z.object({
  name: z.string().min(1).max(120).trim(),
  slug,
  description: emptyToUndef(z.string().max(2000).optional()),
  imageUrl: emptyToUndef(z.string().url().max(500).optional()),
  parentId: emptyToUndef(z.string().cuid().optional().nullable()),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});
export type CreateCategoryDto = z.infer<typeof CreateCategoryDto>;

export const UpdateCategoryDto = CreateCategoryDto.partial();
export type UpdateCategoryDto = z.infer<typeof UpdateCategoryDto>;

export const ListCategoriesQuery = z.object({
  search: z.string().trim().max(120).optional(),
});
export type ListCategoriesQuery = z.infer<typeof ListCategoriesQuery>;

/**
 * Category with nested `children`. The tree endpoint returns roots (parentId=null)
 * with recursive children hydrated. Depth is small in practice (rarely > 3).
 */
export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  children: CategoryTreeNode[];
  productCount: number;
}
