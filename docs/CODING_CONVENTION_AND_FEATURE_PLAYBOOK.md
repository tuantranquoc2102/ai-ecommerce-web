# Coding Convention and Feature Playbook

Ngay cap nhat: 2026-07-09
Pham vi: toan bo he thong monorepo apps/api + apps/web + packages/shared + packages/ui + packages/db.

## 1. Muc tieu tai lieu
- Dong bo cach code giua BE va FE.
- Giam xung dot khi mo rong he thong.
- Dinh nghia quy trinh them tinh nang moi theo 2 kieu:
  - Tinh nang doc lap.
  - Tinh nang lien quan den module hien co.
- Chuan hoa cach FE call BE de giu type-safety, error handling va tinh nhat quan.

## 2. Nguyen tac chung toan he thong
- Domain-first: moi nghiep vu co module ro rang, tranh viet logic trai khap noi.
- Shared contracts: DTO schemas va types dat tai packages/shared, BE va FE cung dung.
- Backward-compatible APIs: uu tien them endpoint moi hoac optional field, tranh breaking change khong can thiet.
- Security-by-default: endpoint khong public phai di qua auth guard + permission guard.
- Observability-by-default: logic quan trong can log co cau truc + ma loi nghiep vu ro rang.
- Test theo rui ro: luong business quan trong phai co test (unit/integration/e2e tuy muc do).

## 3. Backend coding convention (NestJS + Fastify)

### 3.1 Cau truc module
Moi module theo mau:
- controller: tiep nhan HTTP, validate input, map params/query/body.
- service: nghiep vu va transaction.
- module: wiring provider/import/export.
- dto/type: import tu packages/shared.

Mau tham chieu module hien co:
- apps/api/src/modules/orders
- apps/api/src/modules/products
- apps/api/src/modules/authz

### 3.2 Controller rules
- Khong viet business logic phuc tap trong controller.
- Input phai validate bang ZodValidationPipe voi schema tu packages/shared.
- Tra ve du lieu thong qua response wrapper chung (interceptor/filter cua he thong).
- Dat route theo nguyen tac nhat quan:
  - public namespace ro rang neu can public.
  - REST naming ro nghia.

### 3.3 Service rules
- Nghiem cam query va mutate rac o nhieu noi; gom theo use-case method.
- Use transaction cho cac operation can tinh toan ven (atomic):
  - cap nhat nhieu bang.
  - xoa/ghi lai relation role-permission.
- Kiem tra transition state bang helper/domain rule thay vi if-else roi rac.
- Loi nghiep vu tra ve code on dinh, de FE xu ly duoc.

### 3.4 Auth/Authz
- Route public phai danh dau explicit.
- Route private can permission code ro rang.
- Khi thay doi role/permission/resource can flush cache phan quyen.

### 3.5 Data access va schema
- Prisma schema la source-of-truth.
- Field moi trong DB phai di kem:
  - index neu can query nhieu.
  - relation rule onDelete phu hop nghiep vu.
- Migration dat ten ro intent.

### 3.6 Logging va error handling
- Dung logger co cau truc, co context module.
- Log warning voi tinh huong business bat thuong co the theo doi.
- Khong log secret (token, password, cookie).

### 3.7 Job/Cron
- Moi cron can:
  - idempotent.
  - co gioi han batch xu ly.
  - log so luong xu ly va loi.

### 3.8 Testing
- Unit test cho logic domain, guard, utility quan trong.
- Integration test cho luong thanh toan, order transition, stock reservation/release.
- Test case uu tien: race condition, timeout, idempotency, invalid transition.

## 4. Frontend coding convention (Next.js App Router + @ecom/ui)

### 4.1 UI va design system
Bat buoc tuan thu guide:
- packages/ui/docs/AI-AGENT-GUIDE.md

Quy tac cot loi:
- Chi import UI components tu @ecom/ui.
- Khong import truc tiep tu @radix-ui trong app.
- Khong hardcode color, dung semantic tokens.
- Moi admin screen bat dau bang PageHeader.
- Danh sach du lieu dung DataTable.
- Form dung react-hook-form + zod + Form/FormField/FormItem.
- Feedback dung dung component dung muc dich:
  - toast cho transient.
  - Alert cho blocking error.
  - EmptyState cho empty data.
  - Skeleton cho loading.

### 4.2 Structure va phan tach trach nhiem
- app routes: apps/web/src/app
- reusable components: apps/web/src/components
- API layer/client: apps/web/src/lib
- Khong de page component vua fetch phuc tap vua render toan bo UI neu co the tach.

### 4.3 State va data
- Du lieu tu BE phai qua typed API functions.
- Tranh any va object khong typed.
- Phan biet ro:
  - server-side fetch cho storefront public data + cache tags.
  - client-side fetch cho admin interaction/manipulation.

### 4.4 Routing
- Ton trong typed routes (Route type tu next khi can).
- Route admin theo domain group ro rang.

### 4.5 Error UX
- Khong nuot loi.
- Luon hien thong bao co y nghia cho nguoi dung.
- Hanh vi retry/co cach khoi phuc can ro rang.

## 5. Quy trinh them tinh nang moi doc lap

Tinh nang doc lap = module moi, it/phu thuoc thap den module cu.
Vi du: them blog-post module rieng.

### 5.1 Chuan bi
- Lam ro business scope, actor, permissions, API contracts.
- Xac dinh data model moi va relation can thiet.

### 5.2 Backend implementation flow
1. Tao/extend schema Prisma + migration.
2. Them DTO schemas vao packages/shared/src/dto hoac domain phu hop.
3. Tao module moi trong apps/api/src/modules/<feature>:
   - controller
   - service
   - module
4. Dang ky module vao apps/api/src/app.module.ts.
5. Gan auth/public + permission decorator cho endpoint.
6. Them tests cho logic quan trong.

### 5.3 Frontend implementation flow
1. Them typed API functions trong apps/web/src/lib.
2. Tao admin/storefront pages theo design-system rules.
3. Dung DataTable cho list, Form stack cho create/update.
4. Add nav/menu neu can.
5. Add loading/empty/error states day du.

### 5.4 Done criteria
- API contracts typed va khop FE.
- Permission matrix cap nhat day du.
- Test pass va typecheck pass.
- Khong pha vo flow cu.

## 6. Quy trinh them tinh nang lien quan module hien tai

Tinh nang lien quan = can sua module cu, co side-effects lien domain.
Vi du: them refund partial + tac dong inventory + payment ledger + UI orders.

### 6.1 Danh gia tac dong (impact map)
- Domain bi anh huong:
  - data model
  - endpoint hien co
  - permission codes
  - jobs/cron
  - ui screens
  - reporting
- Liet ke backward-compatibility risk.

### 6.2 Nguyen tac triem khai an toan
- Uu tien them moi truoc khi thay doi hanh vi cu.
- Feature flag neu thay doi lon/nhay cam.
- Migration du lieu neu can.
- Dam bao idempotency cho webhook/callback/jobs.

### 6.3 Trinh tu khuyen nghi
1. Chot contract moi va optional fields.
2. Sua BE service + tests.
3. Sua FE API layer.
4. Sua UI screens lien quan.
5. Chay regression test cho cac flow canh bien.
6. Cap nhat docs task va runbook.

### 6.4 Regression checklist toi thieu
- Auth + permissions khong bi bypass.
- Cac status transitions van hop le.
- Cac trang list/detail chinh van render dung.
- Cron/webhook khong double-process.

## 7. Chuan FE call BE trong he thong nay

Co 2 kieu chinh:

### 7.1 Client-side call (admin va trang can tuong tac)
Dung api client tai:
- apps/web/src/lib/api-client.ts

Pattern:
- Goi apiFetch voi path theo prefix /api/v1.
- auth mac dinh true, auto attach bearer token neu co.
- Neu 401 se tu refresh token va retry 1 lan.
- Neu fail se throw ApiError co code/message/status/details.

Quy tac su dung:
- Luon wrap try/catch o UI va hien toast/alert phu hop.
- Khi gui body JSON, de apiFetch tu set content-type.
- Khi gui FormData, khong set content-type thu cong.

### 7.2 Server-side call (storefront public data)
Dung server fetch layer tai:
- apps/web/src/lib/storefront-api.ts

Pattern:
- server-only fetch.
- Su dung next revalidate + tags de cache/invalidate.
- Tra null khi 404/non-ok, tranh lam crash trang.

Quy tac su dung:
- Cac trang public uu tien goi qua storefront-api wrappers.
- Dung cache tags theo domain (products, categories, pages...) de revalidate dung muc.

### 7.3 Contract va typing
- Input/Output contracts lay tu packages/shared.
- FE khong tu invent shape response.
- Neu endpoint doi shape, cap nhat shared truoc, roi BE, roi FE.

### 7.4 Error mapping guideline
- Validation/business error: hien message nguoi dung co context.
- Auth error: redirect login hoac yeu cau dang nhap lai.
- Permission error: hien state "khong co quyen" ro rang.
- Unknown error: message chung + log telemetry neu co.

## 8. Checklist tao PR theo convention
- [ ] Da dung shared DTO/types, khong duplicate schema.
- [ ] Da dat permission/public dung cho endpoint moi.
- [ ] Da co loading/empty/error states o FE.
- [ ] Da co test cho logic nhay cam.
- [ ] Da cap nhat docs lien quan.
- [ ] Da typecheck va test pass.

## 9. Tai lieu tham chieu trong repo
- CLAUDE.md
- packages/ui/docs/AI-AGENT-GUIDE.md
- packages/ui/docs/PATTERNS.md
- apps/api/src/app.module.ts
- apps/api/src/main.ts
- apps/web/src/lib/api-client.ts
- apps/web/src/lib/storefront-api.ts
- docs/SYSTEM_TASK_AUDIT_2026-07-09.md
- .github/PULL_REQUEST_TEMPLATE.md
- docs/PR_TEMPLATE_USAGE.md
