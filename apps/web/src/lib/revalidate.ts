/**
 * Fire-and-forget storefront cache purge. Called from admin pages after any
 * CRUD that affects public-facing content (pages, templates, menus, banners,
 * products). Errors are swallowed — a failed revalidation just means the
 * storefront waits for its 60s TTL, which is annoying but not a real
 * regression.
 *
 * Tag vocabulary lives in apps/web/src/lib/storefront-api.ts.
 */
export async function revalidateStorefront(tags: string[]): Promise<void> {
  if (tags.length === 0) return;
  try {
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
  } catch {
    // Silent — this is a best-effort optimisation.
  }
}
