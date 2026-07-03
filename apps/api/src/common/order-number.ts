import { randomBytes } from 'crypto';

/**
 * Generates a human-readable order number of the shape `PREFIX-YYYYMMDD-XXXXXX`.
 * The suffix is 6 base36 characters (uppercase) drawn from cryptographically
 * secure random bytes — ~2.2B keyspace per prefix+date pair. Callers should
 * retry once on a unique-constraint violation, which is astronomically unlikely
 * but cheap to defend against.
 */
export function generateOrderNumber(prefix: string, now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const suffix = randomBytes(4)
    .readUInt32BE()
    .toString(36)
    .padStart(6, '0')
    .slice(-6)
    .toUpperCase();
  return `${prefix}-${y}${m}${d}-${suffix}`;
}
