# CLAUDE.md

Guidance for Claude Code sessions in this repository.

## What this repo is

A Turborepo monorepo for an e-commerce CMS + storefront, managed with pnpm workspaces.

```
apps/
├── api/           NestJS 10 + Fastify — REST API on port 4000
└── web/           Next.js 15 (App Router) + React 19 — admin CMS
packages/
├── db/            Prisma schema + generated client
├── shared/        Zod schemas + types shared between api and web
└── ui/            Design system (Tailwind v4 + shadcn/ui-style components)
```

## Commands

```
pnpm --filter @ecom/api dev              # API dev (nest --watch, port 4000)
pnpm --filter @ecom/web dev              # Web dev (next dev, port 3000)
pnpm --filter @ecom/ui typecheck         # Typecheck UI package
pnpm --filter @ecom/api typecheck        # Typecheck API
pnpm --filter @ecom/web typecheck        # Typecheck web
pnpm db:migrate                          # Prisma migrate dev
pnpm db:seed                             # Seed roles / permissions / admin user
pnpm docker:up                           # Start Postgres + Redis
```

The api and web scripts pass `--env-file=../../.env` — env config lives in the workspace root `.env`, not per-app.

## Frontend rules — READ BEFORE TOUCHING UI CODE

All frontend components and screens MUST follow the standards in **[packages/ui/docs/AI-AGENT-GUIDE.md](./packages/ui/docs/AI-AGENT-GUIDE.md)**. This is non-negotiable.

TL;DR:
- Import UI only from `@ecom/ui`. Never from `@radix-ui/*` directly. Never inline `style={...}`.
- Never hardcode colors — use semantic tokens (`bg-primary`, `text-muted-foreground`, ...).
- Every screen starts with `<PageHeader>`.
- Every data list uses `<DataTable>`.
- Every form uses `<Form> + <FormField> + <FormItem>` with `react-hook-form` + `zod`.
- Feedback: transient → `useToast()`, blocking → `<Alert>`, empty → `<EmptyState>`, loading → `<Skeleton>`.

See also:
- [packages/ui/docs/README.md](./packages/ui/docs/README.md) — design system overview + setup
- [packages/ui/docs/COMPONENT-GUIDE.md](./packages/ui/docs/COMPONENT-GUIDE.md) — API for every primitive
- [packages/ui/docs/PATTERNS.md](./packages/ui/docs/PATTERNS.md) — full-screen recipes (CRUD, forms, tables)
- [packages/ui/docs/DESIGN-TOKENS.md](./packages/ui/docs/DESIGN-TOKENS.md) — token reference

## Things to know

- **Fastify version pin.** `@nestjs/platform-fastify@10.4.22` requires `fastify@4.28.1` exactly. Do NOT bump `apps/api`'s fastify pin without also verifying no dual-copy in `node_modules/.pnpm`.
- **tsBuildInfoFile.** `apps/api/tsconfig.json` sets `tsBuildInfoFile: "dist/.tsbuildinfo"` so the incremental cache lives inside `dist/` and gets wiped by `nest-cli.json`'s `deleteOutDir: true`. Do not move it outside `dist/`.
- **typedRoutes.** `apps/web/next.config.ts` has `experimental: { typedRoutes: true }`. Nav configs and dynamic route strings must be typed as `Route` from `next`.
- **TLS interception.** This machine has a corp TLS-intercepting proxy. `.npmrc` points pnpm at `.certs/corp-ca-bundle.pem` (exported from the Windows Root cert store). If new deps ever fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, regenerate the bundle from `Cert:\LocalMachine\Root`.
- **Env loading.** `apps/api` and `apps/web` scripts pass `--env-file=../../.env`. There is no `dotenv` / `@nestjs/config` bootstrap; env is loaded by Node itself.
