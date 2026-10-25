/** Deterministic PRNG (mulberry32), so every reset builds the same demo world. */
export const createRandom = (seed: number) => {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(list: readonly T[]) => list[Math.floor(next() * list.length)]!;
  /** Picks from `[value, weight]` pairs. */
  const weighted = <T>(entries: readonly (readonly [T, number])[]) => {
    let roll = next() * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [value, weight] of entries) if ((roll -= weight) < 0) return value;
    return entries.at(-1)![0];
  };
  /** `count` distinct items in random order. */
  const sample = <T>(list: readonly T[], count: number) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy.slice(0, count);
  };
  return { next, int, pick, weighted, sample, chance: (p: number) => next() < p };
};

export type Random = ReturnType<typeof createRandom>;
