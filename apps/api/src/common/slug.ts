/**
 * Convert an arbitrary string to a URL-safe lowercase kebab-case slug.
 * - Strips diacritics (Vietnamese, Latin accents) via NFD normalization.
 * - Replaces the Vietnamese `đ`/`Đ` explicitly (NFD doesn't decompose these).
 * - Collapses whitespace + non-alphanumerics into single hyphens.
 * - Trims leading/trailing hyphens.
 */
export function toSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
