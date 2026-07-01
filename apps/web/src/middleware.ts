import { NextResponse, type NextRequest } from 'next/server';

// Route -> required menu permission code. Keeps the matrix declarative;
// the backend remains the source of truth and re-verifies on every request.
const PROTECTED_ROUTE_PERMS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /^\/admin(?:\/.*)?$/, code: 'menu.dashboard' },
  { pattern: /^\/admin\/catalog(?:\/.*)?$/, code: 'menu.catalog' },
  { pattern: /^\/admin\/orders(?:\/.*)?$/, code: 'menu.orders' },
  { pattern: /^\/admin\/cms(?:\/.*)?$/, code: 'menu.cms' },
  { pattern: /^\/admin\/users(?:\/.*)?$/, code: 'menu.users' },
];

/**
 * Coarse server-side gate: rejects unauthenticated requests at the edge and
 * lets the client-side <PermissionGate> do the fine-grained check (we can't
 * call the API here without a server-aware session adapter — that comes in a
 * follow-up). For now, presence of the access cookie is the signal.
 */
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const match = PROTECTED_ROUTE_PERMS.find((r) => r.pattern.test(pathname));
  if (!match) return NextResponse.next();

  const hasSession = req.cookies.get('ecom.session')?.value;
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
