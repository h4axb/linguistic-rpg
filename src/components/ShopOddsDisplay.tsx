import { useState } from 'react';
import { getDropRates } from '../data';
import { RARITY_DOTS } from '../constants';
import type { Rarity } from '../types';

interface Props {
  level: number;
}

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export function ShopOddsDisplay({ level }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const rates = getDropRates(level);

  return (
    <div
      className="relative flex items-center gap-2 cursor-default select-none"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {RARITIES.map(r => (
        <span key={r} className="text-xs font-mono text-zinc-400">
          {RARITY_DOTS[r]} {Math.round(rates[r] * 100)}%
        </span>
      ))}

      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-zinc-950 border border-zinc-700 rounded p-2.5 text-xs font-mono text-zinc-300 shadow-xl pointer-events-none whitespace-nowrap">
          <p className="text-zinc-500 mb-1.5 uppercase tracking-wider text-[10px]">Rarity Tiers</p>
          <div className="flex flex-col gap-1">
            <span>🟢 Common — basic cards, low cost</span>
            <span>🔵 Rare — stronger effects, medium cost</span>
            <span>🟣 Epic — powerful, high cost</span>
            <span>🟠 Legendary — game-changing, very expensive</span>
          </div>
        </div>
      )}
    </div>
  );
}
