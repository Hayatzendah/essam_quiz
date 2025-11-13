import { normalizeAnswer } from './normalize.util';

describe('normalizeAnswer', () => {
  it('removes diacritics, trims, lowercases', () => {
    expect(normalizeAnswer('  سَلَام   ')).toBe('سلام');
    expect(normalizeAnswer('  Foo  ')).toBe('foo');
  });

  it('normalizes arabic diacritics and spaces', () => {
    expect(normalizeAnswer('  سَلَام   ')).toBe('سلام');
  });

  it('converts to lowercase', () => {
    expect(normalizeAnswer('HELLO')).toBe('hello');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeAnswer('hello    world')).toBe('hello world');
  });

  it('handles empty input', () => {
    expect(normalizeAnswer('')).toBe('');
    expect(normalizeAnswer(null)).toBe('');
    expect(normalizeAnswer(undefined)).toBe('');
  });

  it('respects custom options', () => {
    expect(normalizeAnswer('  HELLO  ', { lowercase: false })).toBe('HELLO');
    expect(normalizeAnswer('  hello  ', { trim: false })).toBe('  hello  ');
  });
});
