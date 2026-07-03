/**
 * Storefront-friendly VND currency formatter. The catalog stores prices as
 * decimal strings, and totals come back the same way. We render as integer VND
 * (no fractional dong) with grouping separators.
 */
export function formatVnd(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
}
