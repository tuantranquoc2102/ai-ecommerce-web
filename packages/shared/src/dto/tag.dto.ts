import { z } from 'zod';

// Slug accepts either an explicit kebab-case string, or empty/undefined
// (in which case the backend generates one from the name via toSlug()).
const slug = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase kebab-case')
    .optional(),
);

export const CreateTagDto = z.object({
  name: z.string().min(1).max(80).trim(),
  slug,
});
export type CreateTagDto = z.infer<typeof CreateTagDto>;

export const UpdateTagDto = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  slug,
});
export type UpdateTagDto = z.infer<typeof UpdateTagDto>;

export const ListTagsQuery = z.object({
  search: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
export type ListTagsQuery = z.infer<typeof ListTagsQuery>;
