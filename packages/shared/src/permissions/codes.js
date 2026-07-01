"use strict";
// Permission CODE constants. These reference rows in the `permissions` table
// by their `code` column — the codes are stable identifiers, the role-to-code
// mapping is fully data-driven. Roles themselves are NEVER hardcoded here.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERM = void 0;
exports.PERM = {
    USER_READ: 'user.read',
    USER_CREATE: 'user.create',
    USER_UPDATE: 'user.update',
    USER_DELETE: 'user.delete',
    ROLE_READ: 'role.read',
    ROLE_CREATE: 'role.create',
    ROLE_UPDATE: 'role.update',
    ROLE_DELETE: 'role.delete',
    ROLE_ASSIGN_PERMISSIONS: 'role.assign_permissions',
    ROLE_ASSIGN_USERS: 'role.assign_users',
    PERMISSION_READ: 'permission.read',
    PERMISSION_CREATE: 'permission.create',
    PERMISSION_UPDATE: 'permission.update',
    PERMISSION_DELETE: 'permission.delete',
    PRODUCT_READ: 'product.read',
    PRODUCT_CREATE: 'product.create',
    PRODUCT_UPDATE: 'product.update',
    PRODUCT_DELETE: 'product.delete',
    CATEGORY_READ: 'category.read',
    CATEGORY_WRITE: 'category.write',
    PAGE_READ: 'page.read',
    PAGE_WRITE: 'page.write',
    BANNER_READ: 'banner.read',
    BANNER_WRITE: 'banner.write',
    MENU_WRITE: 'menu.write',
    POST_READ: 'post.read',
    POST_WRITE: 'post.write',
    ORDER_READ: 'order.read',
    ORDER_UPDATE: 'order.update',
    ORDER_REFUND: 'order.refund',
};
//# sourceMappingURL=codes.js.map