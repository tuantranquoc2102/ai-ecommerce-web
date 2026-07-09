import { z } from 'zod';

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), schema);

const slug = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase kebab-case')
    .optional(),
);

export const CustomerGroupType = z.enum(['MANUAL', 'DYNAMIC']);
export type CustomerGroupType = z.infer<typeof CustomerGroupType>;

/**
 * Membership criteria for DYNAMIC groups. A customer matches when they satisfy
 * ALL provided rules (undefined rules are ignored). Evaluated on recompute.
 */
export const CustomerGroupRules = z.object({
  minTotalSpent: z.number().nonnegative().optional(),
  minOrderCount: z.number().int().nonnegative().optional(),
  lastOrderWithinDays: z.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
});
export type CustomerGroupRules = z.infer<typeof CustomerGroupRules>;

export const CreateCustomerGroupDto = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug,
    description: emptyToUndef(z.string().max(2000).optional()),
    color: emptyToUndef(z.string().max(20).optional()),
    type: CustomerGroupType.default('MANUAL'),
    rules: CustomerGroupRules.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'DYNAMIC' && !data.rules) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rules'],
        message: 'Dynamic groups require at least one rule',
      });
    }
  });
export type CreateCustomerGroupDto = z.infer<typeof CreateCustomerGroupDto>;

export const UpdateCustomerGroupDto = z.object({
  name: emptyToUndef(z.string().trim().min(1).max(120).optional()),
  slug,
  description: emptyToUndef(z.string().max(2000).optional()),
  color: emptyToUndef(z.string().max(20).optional()),
  type: CustomerGroupType.optional(),
  rules: CustomerGroupRules.optional(),
});
export type UpdateCustomerGroupDto = z.infer<typeof UpdateCustomerGroupDto>;

export const ListCustomerGroupsQuery = z.object({
  search: emptyToUndef(z.string().trim().max(200).optional()),
  type: CustomerGroupType.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
export type ListCustomerGroupsQuery = z.infer<typeof ListCustomerGroupsQuery>;

export const AddGroupMembersDto = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(500),
});
export type AddGroupMembersDto = z.infer<typeof AddGroupMembersDto>;

export interface CustomerGroupView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  type: CustomerGroupType;
  rules: CustomerGroupRules | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerGroupMemberView {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  createdAt: string;
}

export interface PaginatedCustomerGroups {
  items: CustomerGroupView[];
  total: number;
  page: number;
  pageSize: number;
}
