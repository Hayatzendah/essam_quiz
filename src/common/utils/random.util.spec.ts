import { mulberry32, pickOne, pickRandom, shuffleInPlace } from './random.util';

describe('mulberry32', () => {
  it('produces stable sequence', () => {
    const r1 = mulberry32(123);
    const r2 = mulberry32(123);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });

  it('generates deterministic rng', () => {
    const rng1 = mulberry32(123);
    const rng2 = mulberry32(123);
    expect(rng1()).toBeCloseTo(rng2());
  });

  it('generates values in [0, 1) range', () => {
    const rng = mulberry32(456);
    for (let i = 0; i < 100; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('shuffle is deterministic with same seed', () => {
    const a = [1, 2, 3, 4];
    const b = [1, 2, 3, 4];
    const s1 = shuffleInPlace(a, mulberry32(42));
    const s2 = shuffleInPlace(b, mulberry32(42));
    expect(s1).toEqual(s2);
  });
});

describe('pickOne', () => {
  it('picks one element deterministically', () => {
    const arr = [1, 2, 3, 4, 5];
    const rng1 = mulberry32(123);
    const rng2 = mulberry32(123);
    expect(pickOne(arr, rng1)).toBe(pickOne(arr, rng2));
  });

  it('throws error on empty array', () => {
    const rng = mulberry32(123);
    expect(() => pickOne([], rng)).toThrow();
  });
});

describe('pickRandom', () => {
  it('picks N elements deterministically', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const rng1 = mulberry32(123);
    const rng2 = mulberry32(123);
    expect(pickRandom(arr, 3, rng1)).toEqual(pickRandom(arr, 3, rng2));
  });

  it('returns empty array for count 0', () => {
    const rng = mulberry32(123);
    expect(pickRandom([1, 2, 3], 0, rng)).toEqual([]);
  });

  it('returns all elements if count >= length', () => {
    const arr = [1, 2, 3];
    const rng = mulberry32(123);
    expect(pickRandom(arr, 5, rng).length).toBe(3);
  });
});

describe('shuffleInPlace', () => {
  it('shuffles deterministically', () => {
    const arr1 = [1, 2, 3, 4, 5];
    const arr2 = [1, 2, 3, 4, 5];
    const rng1 = mulberry32(123);
    const rng2 = mulberry32(123);
    shuffleInPlace(arr1, rng1);
    shuffleInPlace(arr2, rng2);
    expect(arr1).toEqual(arr2);
  });

  it('preserves all elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    const rng = mulberry32(123);
    shuffleInPlace(arr, rng);
    expect(arr.sort()).toEqual(original.sort());
  });
});
