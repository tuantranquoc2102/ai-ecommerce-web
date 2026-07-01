"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignRoleToUsersDto = exports.AssignPermissionsDto = exports.UpdateRoleDto = exports.CreateRoleDto = void 0;
const zod_1 = require("zod");
exports.CreateRoleDto = zod_1.z.object({
    code: zod_1.z.string().regex(/^[A-Z][A-Z0-9_]{1,40}$/),
    name: zod_1.z.string().min(1).max(80),
    description: zod_1.z.string().max(500).optional(),
});
exports.UpdateRoleDto = zod_1.z.object({
    name: zod_1.z.string().min(1).max(80).optional(),
    description: zod_1.z.string().max(500).optional(),
});
exports.AssignPermissionsDto = zod_1.z.object({
    permissionIds: zod_1.z.array(zod_1.z.string().min(1)).max(2000),
});
exports.AssignRoleToUsersDto = zod_1.z.object({
    userIds: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(1000),
});
//# sourceMappingURL=role.dto.js.map