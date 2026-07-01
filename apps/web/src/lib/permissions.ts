import type { PermissionCode } from '@ecom/shared';
import { fetchMe } from './api-client';

export type PermissionPredicate = (codes: Set<string>) => boolean;

export const hasAny =
  (...required: Array<PermissionCode | string>): PermissionPredicate =>
  (codes) =>
    required.some((c) => codes.has(c));

export const hasAll =
  (...required: Array<PermissionCode | string>): PermissionPredicate =>
  (codes) =>
    required.every((c) => codes.has(c));

const TTL_MS = 60_000;
let cached: { at: number; codes: Set<string> } | null = null;

export async function loadPermissions(force = false): Promise<Set<string>> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return cached.codes;
  try {
    const me = await fetchMe();
    cached = { at: Date.now(), codes: new Set(me.permissions) };
  } catch {
    cached = { at: Date.now(), codes: new Set() };
  }
  return cached.codes;
}

export function invalidatePermissionCache(): void {
  cached = null;
}

export async function canVisit(
  predicate: PermissionPredicate,
  opts: { force?: boolean } = {},
): Promise<boolean> {
  const codes = await loadPermissions(opts.force);
  return predicate(codes);
}
