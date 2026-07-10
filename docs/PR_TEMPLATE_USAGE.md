# PR Template Usage and Verification

This guide explains how to use the repository PR template and how to verify a PR before requesting review.

Related template:
- .github/PULL_REQUEST_TEMPLATE.md

## 1. When this template is used
GitHub automatically injects `.github/PULL_REQUEST_TEMPLATE.md` into new pull requests.

Use it for all code changes in this repository.

## 2. How to fill the template

### Step 1: Select PR type
Tick exactly one:
- BE-only
- FE-only
- Fullstack

Rule:
- If code changes touch both `apps/api` and `apps/web`, choose `Fullstack`.
- If only contracts in `packages/shared` change and both sides are impacted, choose `Fullstack`.

### Step 2: Fill summary
Complete:
- Scope
- Business goal
- Related issue/task

Use concise, testable statements.

### Step 3: Fill impacted areas
List concrete paths/modules, for example:
- Backend modules: `orders`, `payments`
- Frontend routes/components: `app/admin/orders`, `components/orders-table.tsx`
- Shared contracts: `packages/shared/src/dto/order.dto.ts`

### Step 4: Complete matching checklist
Only complete the section that matches selected `PR Type`.

If an item is not applicable, keep it unchecked and explain why in `Summary` or `Reviewer Focus`.

### Step 5: Add testing evidence
Tick command items only when they pass.
Add:
- Commands run
- Manual test notes
- Screenshots/recordings for UI changes

### Step 6: Fill security and deployment
Required when applicable:
- Secret/PII checks
- Permission checks
- Migration and rollback plan
- New or changed env vars

## 3. Verification checklist (author)
Before clicking "Ready for review":
- [ ] Exactly one PR Type is selected.
- [ ] Matching checklist section is completed.
- [ ] Required tests/typechecks are attached as evidence.
- [ ] Any unchecked critical item has a written reason.
- [ ] Impacted areas are specific and accurate.
- [ ] Deployment notes are filled if DB/env changed.

## 4. Verification checklist (reviewer)
Use this to validate PR quality quickly:
- [ ] PR Type matches changed files.
- [ ] Checklist answers match actual diff.
- [ ] Test evidence is sufficient for risk level.
- [ ] Permission/auth impact is reviewed for protected routes.
- [ ] Migration and rollback are safe (if schema changed).
- [ ] FE UX states exist: loading, empty, error (if UI touched).

## 5. Recommended command set
Run what applies to your PR:

```bash
pnpm --filter @ecom/api typecheck
pnpm --filter @ecom/api test
pnpm --filter @ecom/web typecheck
pnpm --filter @ecom/shared build
```

For high-risk Fullstack PRs, also run targeted manual end-to-end checks for:
- Auth + permission paths
- Main happy path
- At least 1 edge case

## 6. Common mistakes to avoid
- Selecting multiple PR Types.
- Ticking items without actually running verification.
- Missing deployment notes for migration PRs.
- Saying "N/A" without explanation.
- Claiming Fullstack-safe while only validating one side.
