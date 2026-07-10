## How To Use
1. Tick exactly one `PR Type`.
2. Fill `Summary`, `Impacted Areas`, and `Reviewer Focus`.
3. Complete the matching checklist section only (`BE-only`, `FE-only`, or `Fullstack`).
4. Add test evidence (commands + manual notes + screenshots if UI changed).

## Verify Before Request Review
- Run required commands in `Testing Evidence` and tick only successful ones.
- Ensure unchecked items have a reason in PR description.
- If DB changed, fill `Deployment Notes` (migration + rollback plan).

## PR Type
- [ ] BE-only
- [ ] FE-only
- [ ] Fullstack

## Summary
- Scope:
- Business goal:
- Related issue/task:

## Change Type
- [ ] New feature
- [ ] Enhancement
- [ ] Bug fix
- [ ] Refactor
- [ ] Chore/Docs
- [ ] Breaking change

## Impacted Areas
- Backend modules:
- Frontend routes/components:
- Shared contracts (packages/shared):
- Database (Prisma/migration):
- Infra/Jobs/Webhooks:

## BE-only Checklist (fill if PR Type = BE-only)
- [ ] Controller chi tiep nhan request/response, business logic dat trong service.
- [ ] Input validation dung schema tu packages/shared (ZodValidationPipe).
- [ ] Endpoint private da gan auth/permission dung; endpoint public da danh dau explicit.
- [ ] Loi nghiep vu tra code/message nhat quan, FE co the xu ly.
- [ ] Operation nhieu bang da dung transaction.
- [ ] Da xem xet idempotency cho webhook/callback/cron neu co.
- [ ] Da cap nhat cache invalidation (authz/permission/setting...) neu can.
- [ ] Da cap nhat Prisma schema + migration (neu doi data model).
- [ ] Da cap nhat module wiring (module imports/providers/exports) neu them/sua module.
- [ ] Khong log secret (token/password/cookie), log co context.
- [ ] Da bo sung/cap nhat test cho logic nhay cam.
- [ ] Da chay typecheck/test BE thanh cong.

## FE-only Checklist (fill if PR Type = FE-only)
- [ ] UI import tu @ecom/ui, khong import truc tiep @radix-ui/* trong app.
- [ ] Khong hardcode mau sac; dung semantic tokens.
- [ ] Screen admin co PageHeader.
- [ ] Danh sach du lieu dung DataTable (neu co list).
- [ ] Form dung react-hook-form + zod + Form/FormField/FormItem (neu co form).
- [ ] Loading/Empty/Error states day du (Skeleton/EmptyState/Alert).
- [ ] Toast/UX feedback da ro rang cho action thanh cong/that bai.
- [ ] API call typed, khong dung any cho response model.
- [ ] Error handling khong nuot loi; co fallback UX phu hop.
- [ ] Route/link tuan thu typed routes (Route type) neu co nav config.
- [ ] Accessibility co ban: aria-label cho icon-only buttons, form labels dung chuan.
- [ ] Da chay typecheck FE thanh cong.

## Fullstack Checklist (fill if PR Type = Fullstack)
- [ ] Contracts cap nhat theo thu tu: shared -> BE -> FE.
- [ ] FE khong tu invent response shape, dung contracts tu packages/shared.
- [ ] Endpoint moi/sua da duoc FE integration va xu ly error states.
- [ ] Co danh gia backward compatibility (API/data).
- [ ] Co danh gia impact map: data model, endpoints, permissions, jobs/webhooks, UI.
- [ ] Logic can tranh lap da co idempotency/guard rails.
- [ ] Da cap nhat cache/revalidate tags neu storefront data bi anh huong.
- [ ] Da bo sung test BE (unit/integration) cho luong business quan trong.
- [ ] Da test tay E2E toi thieu cho happy path + 1-2 edge cases.
- [ ] Da cap nhat docs lien quan (playbook/audit/runbook/API notes).

## Testing Evidence
- Commands run:
  - [ ] pnpm --filter @ecom/api typecheck
  - [ ] pnpm --filter @ecom/api test
  - [ ] pnpm --filter @ecom/web typecheck
  - [ ] pnpm --filter @ecom/shared build
- Manual test notes:
- Screenshots / recordings (if UI change):

## Security and Data
- [ ] Khong expose secrets/PII trong code, logs, screenshots.
- [ ] Permission check da du cho endpoint/UI.
- [ ] Validation input/output da du.
- [ ] Migration rollback/compatibility da duoc xem xet (neu co migration).

## Deployment Notes
- Env vars moi/sua:
- Migration required:
- Feature flag (if any):
- Rollback plan:

## Reviewer Focus
- Xin review ky cac phan:
- Risk/assumptions can verify:

## Post-merge Checklist
- [ ] Cap nhat task status trong docs/SYSTEM_TASK_AUDIT_2026-07-09.md (neu can).
- [ ] Cap nhat docs/CODING_CONVENTION_AND_FEATURE_PLAYBOOK.md neu thay doi convention.
