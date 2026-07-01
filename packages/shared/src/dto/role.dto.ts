import { z } from 'zod';

export const CreateRoleDto = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{1,40}$/),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
});
export type CreateRoleDto = z.infer<typeof CreateRoleDto>;

export const UpdateRoleDto = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
});
export type UpdateRoleDto = z.infer<typeof UpdateRoleDto>;

export const AssignPermissionsDto = z.object({
  permissionIds: z.array(z.string().min(1)).max(2000),
});
export type AssignPermissionsDto = z.infer<typeof AssignPermissionsDto>;

export const AssignRoleToUsersDto = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(1000),
});
export type AssignRoleToUsersDto = z.infer<typeof AssignRoleToUsersDto>;
