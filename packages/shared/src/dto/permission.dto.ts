import { z } from 'zod';

export const PermissionTypeEnum = z.enum(['MENU', 'ELEMENT', 'API']);

export const CreatePermissionDto = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_.]{1,80}$/),
  name: z.string().min(1).max(120),
  type: PermissionTypeEnum,
  urlPath: z.string().max(200).optional(),
  apiEndpoint: z
    .string()
    .regex(/^(GET|POST|PUT|PATCH|DELETE) \/.+$/, 'apiEndpoint must look like "METHOD /path"')
    .optional(),
  parentId: z.string().optional(),
});
export type CreatePermissionDto = z.infer<typeof CreatePermissionDto>;

export const UpdatePermissionDto = CreatePermissionDto.partial().omit({ code: true });
export type UpdatePermissionDto = z.infer<typeof UpdatePermissionDto>;
