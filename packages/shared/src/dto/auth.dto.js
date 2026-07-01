"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorVerifyDto = exports.TwoFactorEnableDto = exports.PasswordResetConfirmDto = exports.PasswordResetRequestDto = exports.OtpVerifyDto = exports.OtpRequestDto = exports.RefreshDto = exports.RegisterDto = exports.LoginDto = void 0;
const zod_1 = require("zod");
exports.LoginDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
});
exports.RegisterDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
    firstName: zod_1.z.string().trim().min(1).max(80).optional(),
    lastName: zod_1.z.string().trim().min(1).max(80).optional(),
});
exports.RefreshDto = zod_1.z.object({
    refreshToken: zod_1.z.string().min(20),
});
exports.OtpRequestDto = zod_1.z.object({
    identifier: zod_1.z.string().min(3),
    channel: zod_1.z.enum(['EMAIL', 'SMS']).default('EMAIL'),
});
exports.OtpVerifyDto = zod_1.z.object({
    identifier: zod_1.z.string().min(3),
    code: zod_1.z.string().regex(/^\d{6}$/),
});
exports.PasswordResetRequestDto = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.PasswordResetConfirmDto = zod_1.z.object({
    token: zod_1.z.string().min(20),
    newPassword: zod_1.z.string().min(8).max(128),
});
exports.TwoFactorEnableDto = zod_1.z.object({
    code: zod_1.z.string().regex(/^\d{6}$/),
});
exports.TwoFactorVerifyDto = zod_1.z.object({
    ticket: zod_1.z.string().min(20),
    code: zod_1.z.string().regex(/^\d{6}$/),
});
//# sourceMappingURL=auth.dto.js.map