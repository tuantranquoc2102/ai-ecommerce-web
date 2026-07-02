import { z } from 'zod';

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), schema);

export const UserStatus = z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']);
export type UserStatus = z.infer<typeof UserStatus>;

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128);

export const CreateUserDto = z.object({
  email: z.string().email().max(200).trim().toLowerCase(),
  password,
  firstName: emptyToUndef(z.string().max(100).optional()),
  lastName: emptyToUndef(z.string().max(100).optional()),
  phone: emptyToUndef(z.string().max(50).optional()),
  avatarUrl: emptyToUndef(z.string().url().max(500).optional()),
  status: UserStatus.default('ACTIVE'),
  roleIds: z.array(z.string().cuid()).max(50).optional(),
});
export type CreateUserDto = z.infer<typeof CreateUserDto>;

export const UpdateUserDto = z.object({
  firstName: emptyToUndef(z.string().max(100).optional()),
  lastName: emptyToUndef(z.string().max(100).optional()),
  phone: emptyToUndef(z.string().max(50).optional()),
  avatarUrl: emptyToUndef(z.string().url().max(500).optional()),
  status: UserStatus.optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;

export const AssignRolesToUserDto = z.object({
  roleIds: z.array(z.string().cuid()).max(50),
});
export type AssignRolesToUserDto = z.infer<typeof AssignRolesToUserDto>;

export const ListUsersQuery = z.object({
  search: emptyToUndef(z.string().trim().max(200).optional()),
  status: emptyToUndef(UserStatus.optional()),
  roleId: emptyToUndef(z.string().cuid().optional()),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuery>;
