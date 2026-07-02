import { toSlug } from './slug';

describe('toSlug', () => {
  it('converts spaces to hyphens', () => {
    expect(toSlug('Hello World')).toBe('hello-world');
  });

  it('lowercases everything', () => {
    expect(toSlug('IPHONE 15')).toBe('iphone-15');
  });

  it('collapses runs of separators to a single hyphen', () => {
    expect(toSlug('Foo   Bar!!!Baz')).toBe('foo-bar-baz');
  });

  it('strips leading/trailing separators', () => {
    expect(toSlug('  hello  ')).toBe('hello');
    expect(toSlug('---foo---')).toBe('foo');
  });

  it('strips Vietnamese diacritics via NFD normalization', () => {
    expect(toSlug('Áo thun mùa hè')).toBe('ao-thun-mua-he');
    expect(toSlug('Bún bò Huế')).toBe('bun-bo-hue');
    expect(toSlug('Phở gà đặc biệt')).toBe('pho-ga-dac-biet');
  });

  it('handles Vietnamese đ / Đ (NFD does not decompose these)', () => {
    expect(toSlug('Đây là gì')).toBe('day-la-gi');
    expect(toSlug('đường phèn')).toBe('duong-phen');
  });

  it('handles Latin diacritics from other languages', () => {
    expect(toSlug('café')).toBe('cafe');
    expect(toSlug('naïve résumé')).toBe('naive-resume');
    expect(toSlug('Zürich Straße')).toBe('zurich-stra-e'); // ß not decomposed
  });

  it('returns empty string for only-punctuation input', () => {
    expect(toSlug('!!!')).toBe('');
    expect(toSlug('---')).toBe('');
    expect(toSlug('  ')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(toSlug('')).toBe('');
  });

  it('preserves alphanumerics', () => {
    expect(toSlug('abc123XYZ')).toBe('abc123xyz');
  });

  it('handles mixed digits and letters', () => {
    expect(toSlug('iPhone 15 Pro Max')).toBe('iphone-15-pro-max');
  });

  it('strips emojis and non-BMP chars', () => {
    expect(toSlug('Hello 👋 World')).toBe('hello-world');
  });

  it('preserves numeric-only strings', () => {
    expect(toSlug('2026')).toBe('2026');
  });
});
