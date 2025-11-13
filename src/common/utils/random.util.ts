// Mulberry32 – مولّد عشوائي حتمي
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rng(): number {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296; // [0,1)
  };
}

// اختيار عنصر عشوائي ثابت
export function pickOne<T>(arr: T[], rng: () => number): T {
  if (arr.length === 0) throw new Error('Cannot pick from empty array');
  const idx = Math.floor(rng() * arr.length);
  return arr[idx];
}

// اختيار N عناصر عشوائية ثابتة
export function pickRandom<T>(arr: T[], count: number, rng: () => number): T[] {
  if (count <= 0) return [];
  if (count >= arr.length) return [...arr];

  const shuffled = [...arr];
  shuffleInPlace(shuffled, rng);
  return shuffled.slice(0, count);
}

// Shuffle ثابت
export function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
