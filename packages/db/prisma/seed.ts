import { PrismaClient, PermissionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';

const prisma = new PrismaClient();

/**
 * Force the authz cache to flush by bumping the shared version key. The API's
 * PermissionsService keys each per-user entry with this version, so INCR is
 * equivalent to `DEL cache:permissions:*` but O(1). Seed can't call the
 * NestJS service directly, so we talk to Redis over the wire.
 */
async function bumpAuthzCache() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('REDIS_URL not set — skipping authz cache bump. Restart the API to pick up new permissions.');
    return;
  }
  const redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await redis.connect();
    const v = await redis.incr('cache:permissions:version');
    console.log(`Authz cache version bumped to ${v}. Active sessions will see new permissions on next request.`);
  } catch (e) {
    console.warn(`Could not bump authz cache: ${(e as Error).message}. Restart the API to pick up new permissions.`);
  } finally {
    redis.disconnect();
  }
}

type PermSeed = {
  code: string;
  name: string;
  type: PermissionType;
  urlPath?: string;
  apiEndpoint?: string;
  parentCode?: string;
};

const PERMISSIONS: PermSeed[] = [
  // Menus (UI navigation)
  { code: 'menu.dashboard', name: 'Dashboard', type: 'MENU', urlPath: '/admin' },
  { code: 'menu.catalog', name: 'Catalog', type: 'MENU', urlPath: '/admin/catalog' },
  { code: 'menu.orders', name: 'Orders', type: 'MENU', urlPath: '/admin/orders' },
  { code: 'menu.cms', name: 'Content', type: 'MENU', urlPath: '/admin/cms' },
  { code: 'menu.users', name: 'Users & Access', type: 'MENU', urlPath: '/admin/users' },

  // API: users
  { code: 'user.read', name: 'List/view users', type: 'API', apiEndpoint: 'GET /api/v1/users' },
  { code: 'user.create', name: 'Create user', type: 'API', apiEndpoint: 'POST /api/v1/users' },
  { code: 'user.update', name: 'Update user', type: 'API', apiEndpoint: 'PATCH /api/v1/users/:id' },
  { code: 'user.delete', name: 'Delete user', type: 'API', apiEndpoint: 'DELETE /api/v1/users/:id' },

  // API: roles & permissions (the meta-permissions for the authz engine)
  { code: 'role.read', name: 'List/view roles', type: 'API', apiEndpoint: 'GET /api/v1/roles' },
  { code: 'role.create', name: 'Create role', type: 'API', apiEndpoint: 'POST /api/v1/roles' },
  { code: 'role.update', name: 'Update role', type: 'API', apiEndpoint: 'PATCH /api/v1/roles/:id' },
  { code: 'role.delete', name: 'Delete role', type: 'API', apiEndpoint: 'DELETE /api/v1/roles/:id' },
  { code: 'role.assign_permissions', name: 'Assign permissions to role', type: 'API', apiEndpoint: 'POST /api/v1/roles/:id/permissions' },
  { code: 'role.assign_users', name: 'Assign role to users', type: 'API', apiEndpoint: 'POST /api/v1/roles/:id/users' },

  { code: 'permission.read', name: 'List permissions', type: 'API', apiEndpoint: 'GET /api/v1/permissions' },
  { code: 'permission.create', name: 'Create/register permission resource', type: 'API', apiEndpoint: 'POST /api/v1/permissions' },
  { code: 'permission.update', name: 'Update permission resource', type: 'API', apiEndpoint: 'PATCH /api/v1/permissions/:id' },
  { code: 'permission.delete', name: 'Delete permission resource', type: 'API', apiEndpoint: 'DELETE /api/v1/permissions/:id' },

  // API: catalog (placeholders so the matrix is non-trivial)
  { code: 'product.read', name: 'List/view products', type: 'API', apiEndpoint: 'GET /api/v1/products' },
  { code: 'product.create', name: 'Create product', type: 'API', apiEndpoint: 'POST /api/v1/products' },
  { code: 'product.update', name: 'Update product', type: 'API', apiEndpoint: 'PATCH /api/v1/products/:id' },
  { code: 'product.delete', name: 'Delete product', type: 'API', apiEndpoint: 'DELETE /api/v1/products/:id' },

  { code: 'category.read', name: 'List/view categories', type: 'API', apiEndpoint: 'GET /api/v1/categories' },
  { code: 'category.write', name: 'Manage categories', type: 'API', apiEndpoint: 'POST /api/v1/categories' },

  { code: 'tag.read', name: 'List/view tags', type: 'API', apiEndpoint: 'GET /api/v1/tags' },
  { code: 'tag.write', name: 'Manage tags', type: 'API', apiEndpoint: 'POST /api/v1/tags' },

  // API: CMS
  { code: 'page.read', name: 'List/view pages', type: 'API', apiEndpoint: 'GET /api/v1/pages' },
  { code: 'page.write', name: 'Manage pages', type: 'API', apiEndpoint: 'POST /api/v1/pages' },
  { code: 'block_template.read', name: 'List block templates', type: 'API', apiEndpoint: 'GET /api/v1/block-templates' },
  { code: 'block_template.write', name: 'Manage block templates', type: 'API', apiEndpoint: 'POST /api/v1/block-templates' },
  { code: 'banner.read', name: 'List banners', type: 'API', apiEndpoint: 'GET /api/v1/banners' },
  { code: 'banner.write', name: 'Manage banners', type: 'API', apiEndpoint: 'POST /api/v1/banners' },
  { code: 'menu.read', name: 'List navigation menus', type: 'API', apiEndpoint: 'GET /api/v1/menus' },
  { code: 'menu.write', name: 'Manage navigation menus', type: 'API', apiEndpoint: 'POST /api/v1/menus' },
  { code: 'post.read', name: 'List posts', type: 'API', apiEndpoint: 'GET /api/v1/posts' },
  { code: 'post.write', name: 'Manage blog posts', type: 'API', apiEndpoint: 'POST /api/v1/posts' },

  // API: orders
  { code: 'order.read', name: 'List/view orders', type: 'API', apiEndpoint: 'GET /api/v1/orders' },
  { code: 'order.update', name: 'Update order status', type: 'API', apiEndpoint: 'PATCH /api/v1/orders/:id' },
  { code: 'order.refund', name: 'Refund order', type: 'API', apiEndpoint: 'POST /api/v1/orders/:id/refund' },

  // API: site settings (footer, general config)
  { code: 'setting.read', name: 'View site settings', type: 'API', apiEndpoint: 'GET /api/v1/settings/:key' },
  { code: 'setting.write', name: 'Manage site settings', type: 'API', apiEndpoint: 'PUT /api/v1/settings/:key' },

  // API: customer groups & reviews
  { code: 'customer_group.read', name: 'List/view customer groups', type: 'API', apiEndpoint: 'GET /api/v1/customer-groups' },
  { code: 'customer_group.write', name: 'Manage customer groups', type: 'API', apiEndpoint: 'POST /api/v1/customer-groups' },
  { code: 'review.read', name: 'List/view reviews', type: 'API', apiEndpoint: 'GET /api/v1/reviews' },
  { code: 'review.moderate', name: 'Moderate/reply to reviews', type: 'API', apiEndpoint: 'PATCH /api/v1/reviews/:id' },

  // API: marketing
  { code: 'coupon.read', name: 'List/view coupons', type: 'API', apiEndpoint: 'GET /api/v1/coupons' },
  { code: 'coupon.write', name: 'Manage coupons', type: 'API', apiEndpoint: 'POST /api/v1/coupons' },
  { code: 'promotion.read', name: 'List/view promotions', type: 'API', apiEndpoint: 'GET /api/v1/promotions' },
  { code: 'promotion.write', name: 'Manage promotions', type: 'API', apiEndpoint: 'POST /api/v1/promotions' },

  // UI elements (rendered conditionally on the front-end)
  { code: 'element.user.delete_button', name: 'Show delete-user button', type: 'ELEMENT' },
  { code: 'element.order.refund_button', name: 'Show refund-order button', type: 'ELEMENT' },
];

const ROLES: { code: string; name: string; description: string; isSystem: boolean; permissions: string[] | 'ALL' }[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full system access. Protected from deletion.',
    isSystem: true,
    permissions: 'ALL',
  },
  {
    code: 'ADMIN',
    name: 'Admin',
    description: 'Operational admin without role/permission management.',
    isSystem: true,
    permissions: [
      'menu.dashboard', 'menu.catalog', 'menu.orders', 'menu.cms', 'menu.users',
      'user.read', 'user.update',
      'product.read', 'product.create', 'product.update', 'product.delete',
      'category.read', 'category.write',
      'page.read', 'page.write', 'banner.read', 'banner.write', 'menu.write',
      'block_template.read', 'block_template.write',
      'post.read', 'post.write',
      'order.read', 'order.update', 'order.refund',
      'element.order.refund_button',
      'setting.read', 'setting.write',
      'customer_group.read', 'customer_group.write',
      'review.read', 'review.moderate',
      'coupon.read', 'coupon.write',
      'promotion.read', 'promotion.write',
    ],
  },
  {
    code: 'EDITOR',
    name: 'Content Editor',
    description: 'CMS-only access.',
    isSystem: true,
    permissions: [
      'menu.dashboard', 'menu.cms',
      'page.read', 'page.write', 'banner.read', 'banner.write',
      'block_template.read', 'block_template.write',
      'post.read', 'post.write',
    ],
  },
  {
    code: 'CUSTOMER',
    name: 'Customer',
    description: 'Default storefront user. No back-office permissions.',
    isSystem: true,
    permissions: [],
  },
];

async function main() {
  const permByCode = new Map<string, string>();

  for (const p of PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, type: p.type, urlPath: p.urlPath, apiEndpoint: p.apiEndpoint },
      create: {
        code: p.code,
        name: p.name,
        type: p.type,
        urlPath: p.urlPath,
        apiEndpoint: p.apiEndpoint,
      },
    });
    permByCode.set(p.code, row.id);
  }

  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description, isSystem: r.isSystem },
      create: { code: r.code, name: r.name, description: r.description, isSystem: r.isSystem },
    });

    const targetIds = r.permissions === 'ALL'
      ? Array.from(permByCode.values())
      : r.permissions.map((c) => {
          const id = permByCode.get(c);
          if (!id) throw new Error(`Permission code "${c}" referenced by role "${r.code}" not found in seed`);
          return id;
        });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: targetIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      }),
    ]);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@ecom.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!123';

  const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  if (!superAdminRole) throw new Error('SUPER_ADMIN role missing after seed');

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });

  console.log(`Seeded ${PERMISSIONS.length} permissions, ${ROLES.length} roles.`);
  console.log(`Super admin: ${adminEmail} / ${adminPassword}  <-- change after first login`);

  await bumpAuthzCache();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
