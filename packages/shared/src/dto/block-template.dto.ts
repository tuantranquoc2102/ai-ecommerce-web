import { z } from 'zod';

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), schema);

export const CreateBlockTemplateDto = z.object({
  name: z.string().min(1).max(120).trim(),
  blockType: z.string().min(1).max(80),
  config: z.record(z.unknown()).default({}),
  previewImage: emptyToUndef(z.string().url().max(500).optional()),
});
export type CreateBlockTemplateDto = z.infer<typeof CreateBlockTemplateDto>;

export const UpdateBlockTemplateDto = CreateBlockTemplateDto.partial();
export type UpdateBlockTemplateDto = z.infer<typeof UpdateBlockTemplateDto>;

export const ListBlockTemplatesQuery = z.object({
  blockType: emptyToUndef(z.string().max(80).optional()),
  search: emptyToUndef(z.string().trim().max(200).optional()),
  // Defaults true for backward compatibility; list pages can disable to slim payload.
  includeConfig: z.coerce.boolean().default(true),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
export type ListBlockTemplatesQuery = z.infer<typeof ListBlockTemplatesQuery>;
