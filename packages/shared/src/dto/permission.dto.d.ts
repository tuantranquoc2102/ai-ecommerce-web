import { z } from 'zod';
export declare const PermissionTypeEnum: z.ZodEnum<["MENU", "ELEMENT", "API"]>;
export declare const CreatePermissionDto: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["MENU", "ELEMENT", "API"]>;
    urlPath: z.ZodOptional<z.ZodString>;
    apiEndpoint: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    type: "MENU" | "ELEMENT" | "API";
    name: string;
    urlPath?: string | undefined;
    apiEndpoint?: string | undefined;
    parentId?: string | undefined;
}, {
    code: string;
    type: "MENU" | "ELEMENT" | "API";
    name: string;
    urlPath?: string | undefined;
    apiEndpoint?: string | undefined;
    parentId?: string | undefined;
}>;
export type CreatePermissionDto = z.infer<typeof CreatePermissionDto>;
export declare const UpdatePermissionDto: z.ZodObject<Omit<{
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["MENU", "ELEMENT", "API"]>>;
    urlPath: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    apiEndpoint: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    parentId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "code">, "strip", z.ZodTypeAny, {
    type?: "MENU" | "ELEMENT" | "API" | undefined;
    name?: string | undefined;
    urlPath?: string | undefined;
    apiEndpoint?: string | undefined;
    parentId?: string | undefined;
}, {
    type?: "MENU" | "ELEMENT" | "API" | undefined;
    name?: string | undefined;
    urlPath?: string | undefined;
    apiEndpoint?: string | undefined;
    parentId?: string | undefined;
}>;
export type UpdatePermissionDto = z.infer<typeof UpdatePermissionDto>;
//# sourceMappingURL=permission.dto.d.ts.map