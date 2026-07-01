"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fail = exports.ok = void 0;
const ok = (data, meta) => ({
    success: true,
    data,
    ...(meta ? { meta } : {}),
});
exports.ok = ok;
const fail = (code, message, details) => ({
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
});
exports.fail = fail;
//# sourceMappingURL=api-response.js.map