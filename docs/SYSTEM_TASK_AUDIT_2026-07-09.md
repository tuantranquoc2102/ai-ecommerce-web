# System Task Audit - 2026-07-09

Tai lieu coding convention va huong dan trien khai tinh nang:
- docs/CODING_CONVENTION_AND_FEATURE_PLAYBOOK.md

## 1) Phạm vi đã rà soát
- Kien truc monorepo, script va requirement: README.md, CLAUDE.md, docs/Requirement.md.
- Backend: toan bo module trong apps/api/src/modules, app.module.ts, schema Prisma.
- Frontend: route App Router trong apps/web/src/app, luong goi API o apps/web/src/lib va components.
- Test first-party (không tính node_modules).

## 2) Ban do nghiep vu hien co

### 2.1 Auth + Authorization
- Dang ky, dang nhap, refresh token, logout, me.
- OTP login/request + verify.
- 2FA TOTP: setup/enable/disable.
- Password reset request/confirm.
- OAuth Google/Facebook callback (dang o muc stub/flow co san).
- Dynamic RBAC/PBAC:
  - Permission guard theo route metadata.
  - Cache permission theo user + cache version trong Redis.
  - Flush cache khi thay đổi role/permission.

### 2.2 Nguoi dung, vai tro, quyen
- User CRUD + gan role + force logout sessions.
- Role CRUD + assign permissions atomic transaction.
- Permission registry CRUD (MENU/ELEMENT/API).

### 2.3 Catalog
- Product CRUD (physical/digital), public listing, by slug, by ids.
- Category CRUD + tree + public tree + by slug.
- Tag CRUD + public list.
- Variant matrix algorithm (cartesian), test day du trong shared package.
- Media upload S3/MinIO.

### 2.4 CMS
- Page CRUD + by slug (phuc vu storefront block renderer).
- Menu CRUD + public by position.
- Banner CRUD + active banners + click/impression.
- Banner scheduler cron tu dong deactivate khi het han.
- Block template CRUD.
- Footer setting (admin/public).

### 2.5 Orders + Payments
- Checkout guest/auth.
- Reserve stock khi checkout.
- Order lifecycle + transition rules + status history.
- Refund endpoint (ledger + restock tuy chon).
- Update shipping info.
- Order token cho guest (xem chi tiet don khong can tai khoan).
- Payment providers: COD, VNPAY, MOMO.
- IPN handling + idempotency lock Redis + return URL.
- Cron expire pending orders sau timeout thanh toan.
- Digital entitlement cap khi order paid (FILE_DOWNLOAD/SERIAL_KEY).

### 2.6 Customer growth
- Customer groups CRUD, member management, recompute dynamic groups.
- Reviews moderation: list/filter, approve/reject/hide, reply, delete.

### 2.7 Frontend Web/CMS
- Admin shell + route map day du theo domain.
- Man hinh da co luong nghiep vu thuc: orders, products, categories, roles, permissions, users/customers, reviews, pages, menus, banners, block templates, tags, footer setting.
- Storefront da co: home by CMS blocks, list product, detail product, category page, cart, checkout, payment return, account pages, order tracking page.

## 3) Danh sach task da DONE

### A. Nen tang va ha tang
- [DONE] A01 - Monorepo Turborepo + pnpm workspace cho API/Web/DB/Shared/UI.
- [DONE] A02 - Prisma schema lon bao gom Auth, Catalog, CMS, Orders, Payments, Customer Groups, Reviews.
- [DONE] A03 - Redis setup cho authz cache, OTP/session va payment/order workflows.

### B. Bao mat va phan quyen
- [DONE] B01 - JWT auth guard + permission guard toan cuc.
- [DONE] B02 - Dynamic permission cache versioning (invalidate O(1)).
- [DONE] B03 - API role-permission assignment atomic (xoa cu + tao moi trong transaction).

### C. Catalog va CMS
- [DONE] C01 - Product/Category/Tag CRUD + public APIs.
- [DONE] C02 - Variant matrix generator + test coverage.
- [DONE] C03 - Media upload S3/MinIO.
- [DONE] C04 - Pages/Menus/Banners/Block templates CRUD.
- [DONE] C05 - Banner click/impression + scheduler expire.

### D. Don hang va thanh toan
- [DONE] D01 - Checkout guest/auth + coupon validate khi checkout.
- [DONE] D02 - Stock reservation/release + order timeout sweeper.
- [DONE] D03 - Payment gateway luong VNPAY/MOMO/COD + IPN idempotency.
- [DONE] D04 - Order transitions, refund, shipping update, order tracking.
- [DONE] D05 - Digital entitlements tao sau khi paid.

### E. Frontend CMS + Storefront
- [DONE] E01 - Admin dashboard shell + route groups.
- [DONE] E02 - Orders management screens (all/processing/shipping/returns).
- [DONE] E03 - Products + categories screens co tao/sua/xoa/filter.
- [DONE] E04 - Roles + permissions matrix screens.
- [DONE] E05 - Customers + customer groups + reviews moderation screens.
- [DONE] E06 - CMS pages + menus + banners + templates screens.
- [DONE] E07 - Storefront shopping + checkout + account + order pages.

### F. Testing
- [DONE] F01 - Unit test cho PermissionsGuard.
- [DONE] F02 - Unit test cho Products/Categories/Banners services.
- [DONE] F03 - Shared tests cho DTO va variant matrix.

## 4) Danh sach task con thieu (TODO backlog)

### P0 - Can lam ngay de van hanh production
- [TODO] P0-01 - Hoan thien middleware authz frontend: hien chi check cookie session, chua verify permission realtime theo route.
- [TODO] P0-02 - Chot va tach provider CREDIT_CARD (hien dang placeholder map sang MOMO).
- [TODO] P0-03 - Bo sung monitoring + alerting cho jobs quan trong: expire order, banner scheduler, IPN failures.
- [TODO] P0-04 - Tang test coverage cho luong payments/orders (IPN replay, race conditions, timeout stock release).
- [TODO] P0-05 - Bo sung integration/e2e test cho checkout end-to-end (guest/auth, COD/VNPAY/MOMO).

### P1 - Nghiep vu quan trong theo requirement chua day
- [TODO] P1-01 - Module Blog/Post management (Post, PostCategory) + frontend admin va storefront.
- [TODO] P1-02 - Coupon management CRUD (hien chi co validate endpoint, trang admin marketing/coupons dang under construction).
- [TODO] P1-03 - Promotions engine (marketing/promotions dang under construction).
- [TODO] P1-04 - Inventory management screen + nghiep vu kho chi tiet (admin/inventory dang under construction).
- [TODO] P1-05 - Settings payments/shipping pages (dang under construction) + cau hinh gateway/carrier tu UI.
- [TODO] P1-06 - Tich hop don vi van chuyen GHN/GHTK va tinh phi ship dong theo khoi luong/dia chi.
- [TODO] P1-07 - Presigned download URL flow cho digital FILE_DOWNLOAD (hien thay entitlement, chua thay endpoint download signed URL).

### P2 - Nâng cao và tối ưu
- [TODO] P2-01 - Analytics pages (sales/behavior/products) hien under construction.
- [TODO] P2-02 - Dashboard KPI realtime (GMV, conversion, AOV, funnel).
- [TODO] P2-03 - Search/sort/filter nang cao cho toan bo admin lists.
- [TODO] P2-04 - Audit log chi tiet cho hanh dong admin (ai da doi status/refund/permission).
- [TODO] P2-05 - Cung co security hardening: CSP, stricter cookie/session strategy, SIEM-friendly logs.

## 5) Trạng thái các màn hình under construction (web)
- admin/analytics/sales
- admin/analytics/behavior
- admin/analytics/products
- admin/inventory
- admin/marketing/coupons
- admin/marketing/promotions
- admin/settings/payments
- admin/settings/shipping

## 6) Kết luận
Hệ thống đã hoàn thành phần lớn MVP e-commerce + CMS + RBAC động.
Có khả năng demo và vận hành staging tốt. 
Khoảng trống lớn nhất để lên Production đầy đủ là: 
  + Quản trị marketing (coupon/promotion)
  + Shipping integration
  + Blog CMS
  + Hardening authz frontend
  + Và test e2e cho checkout/payment.