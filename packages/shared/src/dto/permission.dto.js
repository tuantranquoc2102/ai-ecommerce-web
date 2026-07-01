"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePermissionDto = exports.CreatePermissionDto = exports.PermissionTypeEnum = void 0;
const zod_1 = require("zod");
exports.PermissionTypeEnum = zod_1.z.enum(['MENU', 'ELEMENT', 'API']);
exports.CreatePermissionDto = zod_1.z.object({
    code: zod_1.z.string().regex(/^[a-z][a-z0-9_.]{1,80}$/),
    name: zod_1.z.string().min(1).max(120),
    type: exports.PermissionTypeEnum,
    urlPath: zod_1.z.string().max(200).optional(),
    apiEndpoint: zod_1.z
        .string()
        .regex(/^(GET|POST|PUT|PATCH|DELETE) \/.+$/, 'apiEndpoint must look like "METHOD /path"')
        .optional(),
    parentId: zod_1.z.string().optional(),
});
exports.UpdatePermissionDto = exports.CreatePermissionDto.partial().omit({ code: true });
//# sourceMappingURL=permission.dto.js.map