# @ecom/ui — Design System

The shared UI package for the Ecom CMS monorepo. Built on **Tailwind CSS v4**, **Radix UI primitives**, and **shadcn/ui-style ownership** — every component lives in this repo and is fully editable.

## What lives here

```
packages/ui/
├── src/
│   ├── styles/globals.css      # Design tokens + base layer
│   ├── lib/cn.ts               # clsx + tailwind-merge helper
│   ├── components/             # Owned primitives (button, dialog, form, ...)
│   ├── patterns/               # Composite patterns (data-table, page-header, ...)
│   └── index.ts                # Barrel export
└── docs/
    ├── README.md               # This file
    ├── DESIGN-TOKENS.md        # Every color / spacing / radius token
    ├── COMPONENT-GUIDE.md      # API for each component
    ├── PATTERNS.md             # How to compose full screens
    └── AI-AGENT-GUIDE.md       # ⭐ RULES for AI when coding new screens
```

## Quick start (consumers)

Any workspace app that uses this package:

1. Add the workspace dep:
   ```json
   { "dependencies": { "@ecom/ui": "workspace:*" } }
   ```

2. Add to Next.js `transpilePackages` (`next.config.ts`):
   ```ts
   transpilePackages: ['@ecom/shared', '@ecom/ui'],
   ```

3. Install Tailwind and its PostCSS plugin **in the app** (so the build tool
   knows to process CSS in that consumer's context):
   ```json
   {
     "devDependencies": {
       "tailwindcss": "^4.0.0",
       "@tailwindcss/postcss": "^4.0.0",
       "tw-animate-css": "^1.2.9"
     }
   }
   ```
   (`tw-animate-css` is the Tailwind v4 replacement for the v3 `tailwindcss-animate` plugin.)

4. Create `postcss.config.mjs` in the app root:
   ```js
   export default { plugins: { '@tailwindcss/postcss': {} } };
   ```

5. Create `src/app/globals.css`:
   ```css
   @import "tailwindcss";
   @import "tw-animate-css";
   @import "@ecom/ui/styles/globals.css";

   /* Point Tailwind's content scanner at @ecom/ui sources. */
   @source "../../../../packages/ui/src/**/*.{ts,tsx}";
   ```

6. In root layout, wrap children with providers:
   ```tsx
   import { ToastProvider, TooltipProvider } from '@ecom/ui';
   import './globals.css';

   <html>
     <body className="bg-background text-foreground antialiased">
       <TooltipProvider>
         <ToastProvider>{children}</ToastProvider>
       </TooltipProvider>
     </body>
   </html>
   ```

7. Import components from `@ecom/ui`:
   ```tsx
   import { Button, Card, PageHeader, DataTable } from '@ecom/ui';
   ```

## Design principles

1. **Own our components.** Everything here is copyable, forkable, editable code — no black-box library upgrades.
2. **Semantic tokens over raw values.** Components reference `bg-primary`, not `bg-blue-500`. Re-brand = change tokens once.
3. **Accessibility comes from Radix.** Never remove `aria-*` attributes or replace primitives with plain HTML.
4. **Patterns > pages.** Screens are assembled from patterns (`PageHeader`, `DataTable`, `EmptyState`, ...). Don't re-invent layouts.
5. **AI-friendly.** Rules for coding new screens are enforceable and documented in [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md). Every AI agent working on this codebase MUST follow those rules.

## Reading order

- Start with **[AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md)** if you're an AI agent or a new contributor. This is the rules-of-the-road file.
- Then **[PATTERNS.md](./PATTERNS.md)** for full-screen recipes (CRUD list, detail form, ...).
- Then **[COMPONENT-GUIDE.md](./COMPONENT-GUIDE.md)** as a reference when you need a specific primitive.
- **[DESIGN-TOKENS.md](./DESIGN-TOKENS.md)** is only needed when you're re-theming or extending the palette.

## Editing a component

Because we own the code, edits are direct:

```bash
# 1. Edit the source
$EDITOR packages/ui/src/components/button.tsx

# 2. Consumers pick it up automatically via transpilePackages — no build step
pnpm --filter @ecom/web dev
```

Nothing to publish, no version bumps. Just edit and go.
