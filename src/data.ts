import type { Rarity } from './types'

// Mirrors RARITY_WEIGHTS in useGameStore — cumulative thresholds ×100
const WEIGHTS: Record<number, [number, number, number, number, number]> = {
  1: [60,   90,   99,    100,   100],
  2: [45,   75,   95,    100,   100],
  3: [25,   55,   90,    99.5,  100],
  4: [15,   40,   90,    99,    100],
  5: [5,    30,   90,    98,    100],
}

export function getDropRates(level: number): Record<Rarity, number> {
  const w = WEIGHTS[Math.max(1, Math.min(5, level))]
  return {
    common:    w[0] / 100,
    rare:      (w[1] - w[0]) / 100,
    epic:      (w[2] - w[1]) / 100,
    legendary: (w[3] - w[2]) / 100,
    cursed:    (w[4] - w[3]) / 100,
  }
}
