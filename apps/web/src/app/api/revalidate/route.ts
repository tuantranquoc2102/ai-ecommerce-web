import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Admin-triggered storefront cache purge. Called by admin CRUD flows after
 * mutating pages/templates/menus/banners so the public storefront pulls
 * fresh data on the very next request instead of waiting for the 60s TTL.
 *
 * Body: { tags: string[] } — anything from the storefront-api tag vocabulary
 * (e.g. "pages", "products", "banners:home_hero"). Unknown tags are still
 * safe to pass; Next.js just ignores tags no cached fetch registered under.
 *
 * Not session-authenticated in this scaffold; the endpoint is idempotent and
 * causes no data mutation, so worst case someone hits it and Next re-fetches
 * from the API on the next storefront request. For production, gate on a
 * signed session cookie or shared secret via the `x-revalidate-token` header.
 */
export async function POST(request: Request) {
  let body: { tags?: unknown } = {};
  try {
    body = (await request.json()) as { tags?: unknown };
  } catch {
    // Empty body → nothing to revalidate.
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string' && t.length > 0)
    : [];

  if (tags.length === 0) {
    return NextResponse.json({ success: true, data: { revalidated: [] } });
  }

  for (const tag of tags) revalidateTag(tag);

  return NextResponse.json({ success: true, data: { revalidated: tags } });
}
