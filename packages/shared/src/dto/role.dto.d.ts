import { z } from 'zod';
export declare const CreateRoleDto: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    description?: string | undefined;
}, {
    code: string;
    name: string;
    description?: string | undefined;
}>;
export type CreateRoleDto = z.infer<typeof CreateRoleDto>;
export declare const UpdateRoleDto: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
}>;
export type UpdateRoleDto = z.infer<typeof UpdateRoleDto>;
export declare const AssignPermissionsDto: z.ZodObject<{
    permissionIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    permissionIds: string[];
}, {
    permissionIds: string[];
}>;
export type AssignPermissionsDto = z.infer<typeof AssignPermissionsDto>;
export declare const AssignRoleToUsersDto: z.ZodObject<{
    userIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    userIds: string[];
}, {
    userIds: string[];
}>;
export type AssignRoleToUsersDto = z.infer<typeof AssignRoleToUsersDto>;
//# sourceMappingURL=role.dto.d.ts.map