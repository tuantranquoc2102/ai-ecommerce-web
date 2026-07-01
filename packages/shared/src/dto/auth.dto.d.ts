import { z } from 'zod';
export declare const LoginDto: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginDto = z.infer<typeof LoginDto>;
export declare const RegisterDto: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
}, {
    email: string;
    password: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
}>;
export type RegisterDto = z.infer<typeof RegisterDto>;
export declare const RefreshDto: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export type RefreshDto = z.infer<typeof RefreshDto>;
export declare const OtpRequestDto: z.ZodObject<{
    identifier: z.ZodString;
    channel: z.ZodDefault<z.ZodEnum<["EMAIL", "SMS"]>>;
}, "strip", z.ZodTypeAny, {
    identifier: string;
    channel: "EMAIL" | "SMS";
}, {
    identifier: string;
    channel?: "EMAIL" | "SMS" | undefined;
}>;
export type OtpRequestDto = z.infer<typeof OtpRequestDto>;
export declare const OtpVerifyDto: z.ZodObject<{
    identifier: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    identifier: string;
}, {
    code: string;
    identifier: string;
}>;
export type OtpVerifyDto = z.infer<typeof OtpVerifyDto>;
export declare const PasswordResetRequestDto: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type PasswordResetRequestDto = z.infer<typeof PasswordResetRequestDto>;
export declare const PasswordResetConfirmDto: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export type PasswordResetConfirmDto = z.infer<typeof PasswordResetConfirmDto>;
export declare const TwoFactorEnableDto: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
export type TwoFactorEnableDto = z.infer<typeof TwoFactorEnableDto>;
export declare const TwoFactorVerifyDto: z.ZodObject<{
    ticket: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    ticket: string;
}, {
    code: string;
    ticket: string;
}>;
export type TwoFactorVerifyDto = z.infer<typeof TwoFactorVerifyDto>;
export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
};
export type LoginResult = {
    stage: 'COMPLETE';
    tokens: AuthTokens;
    user: AuthUserView;
} | {
    stage: 'TWO_FACTOR_REQUIRED';
    ticket: string;
};
export type AuthUserView = {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    roles: string[];
    permissions: string[];
};
//# sourceMappingURL=auth.dto.d.ts.map