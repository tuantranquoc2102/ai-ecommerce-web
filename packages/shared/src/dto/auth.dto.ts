import { z } from 'zod';

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type LoginDto = z.infer<typeof LoginDto>;

export const RegisterDto = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
});
export type RegisterDto = z.infer<typeof RegisterDto>;

export const RefreshDto = z.object({
  refreshToken: z.string().min(20),
});
export type RefreshDto = z.infer<typeof RefreshDto>;

export const OtpRequestDto = z.object({
  identifier: z.string().min(3),
  channel: z.enum(['EMAIL', 'SMS']).default('EMAIL'),
});
export type OtpRequestDto = z.infer<typeof OtpRequestDto>;

export const OtpVerifyDto = z.object({
  identifier: z.string().min(3),
  code: z.string().regex(/^\d{6}$/),
});
export type OtpVerifyDto = z.infer<typeof OtpVerifyDto>;

export const PasswordResetRequestDto = z.object({
  email: z.string().email(),
});
export type PasswordResetRequestDto = z.infer<typeof PasswordResetRequestDto>;

export const PasswordResetConfirmDto = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(8).max(128),
});
export type PasswordResetConfirmDto = z.infer<typeof PasswordResetConfirmDto>;

export const TwoFactorEnableDto = z.object({
  code: z.string().regex(/^\d{6}$/),
});
export type TwoFactorEnableDto = z.infer<typeof TwoFactorEnableDto>;

export const TwoFactorVerifyDto = z.object({
  ticket: z.string().min(20),
  code: z.string().regex(/^\d{6}$/),
});
export type TwoFactorVerifyDto = z.infer<typeof TwoFactorVerifyDto>;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type LoginResult =
  | { stage: 'COMPLETE'; tokens: AuthTokens; user: AuthUserView }
  | { stage: 'TWO_FACTOR_REQUIRED'; ticket: string };

export type AuthUserView = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  permissions: string[];
};
