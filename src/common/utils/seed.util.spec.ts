import { seedFrom } from './seed.util';

describe('seedFrom', () => {
  it('is deterministic', () => {
    const a = seedFrom('e1', 'u1', 1);
    const b = seedFrom('e1', 'u1', 1);
    expect(a).toBe(b);
  });

  it('generates stable seed', () => {
    const a = seedFrom('e1', 's1', 1);
    const b = seedFrom('e1', 's1', 1);
    expect(a).toBe(b);
  });

  it('generates different seeds for different inputs', () => {
    const a = seedFrom('e1', 's1', 1);
    const b = seedFrom('e1', 's1', 2);
    expect(a).not.toBe(b);
  });

  it('generates 32-bit number', () => {
    const seed = seedFrom('exam123', 'student456', 1);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});
