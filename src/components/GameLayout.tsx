import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useGameStore, calcHPPactCost, HP_PACT_HEAL_AMOUNT } from '../store/useGameStore'
import type { Card, Element as GameElement, Rarity, LogEntry, DatabankEntry } from '../store/useGameStore'
import { ShopOddsDisplay } from './ShopOddsDisplay'

const G = 32

// ── Lookup Tables ─────────────────────────────────────────────────────────────

const HANJA: Record<string, string> = {
  fire: '火', water: '水', stone: '石', plant: '木', necro: '阴', light: '阳',
  void: '空', shadow: '暗', dusk: '昏', soul: '魂', dark: '闇', echo: '響',
  ember: '火', frost: '氷', root: '根', storm: '嵐', wind: '風', sea: '海',
  sky: '天', earth: '地', ash: '灰', blade: '刃', iron: '鐵', blood: '血',
  bone: '骨', venom: '毒', ruin: '滅', curse: '呪', thorn: '刺',
}

const FALLBACK_HANJA = ['具', '物', '爻', '器', '兵', '符']

interface ElementPalette { core: string; bright: string; mid: string; shadow: string; bg: string }
const PALETTE: Record<GameElement, ElementPalette> = {
  fire:  { core: '#ff2200', bright: '#ff9900', mid: '#cc3300', shadow: '#330000', bg: '#000000' },
  water: { core: '#1144ff', bright: '#88eeff', mid: '#0033cc', shadow: '#001133', bg: '#000000' },
  stone: { core: '#778899', bright: '#ccccbb', mid: '#556677', shadow: '#1a2233', bg: '#000000' },
  plant: { core: '#228822', bright: '#88ff44', mid: '#115511', shadow: '#001100', bg: '#000000' },
  necro: { core: '#550099', bright: '#cc00ff', mid: '#330055', shadow: '#110022', bg: '#000000' },
  light: { core: '#cc8800', bright: '#ffffff', mid: '#aa6600', shadow: '#332200', bg: '#000000' },
}

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-neutral-500', rare: 'border-blue-400',
  epic: 'border-purple-400', legendary: 'border-orange-400', cursed: 'border-rose-700',
}

const ELEMENT_TEXT: Record<GameElement, string> = {
  fire: 'text-red-400', water: 'text-blue-400', stone: 'text-slate-400',
  plant: 'text-green-400', necro: 'text-violet-400', light: 'text-yellow-300',
}

const BOSS_TITLES: Record<GameElement, string> = {
  fire: 'THE FIRE WARDEN', water: 'THE TIDE SOVEREIGN', stone: 'THE STONE COLOSSUS',
  plant: 'THE ROOT DEVOURER', necro: 'THE VOID SHEPHERD', light: 'THE GILDED TYRANT',
}

const UPLOADED_STENCILS: Record<string, string[]> = {
  "sm_Shield_4": ["00000000","00000000","00000000","00000000","00000000","00000000","000fc000","000fc000","03ffff00","03ffff00","03ffff00","03ffff00","03ffff00","03ffff00","03ffff00","03ffff00","03ffff00","03ffff00","00fffc00","00fffc00","00fffc00","00fffc00","003ff000","003ff000","000fc000","000fc000","00000000","00000000","00000000","00000000","00000000","00000000"],
  "sm_Shield_5": ["00000000","00000000","00000000","00000000","00000000","00000000","0c0ff030","0c0ff030","0ffffff0","0ffffff0","03ffffc0","03ffffc0","03ffffc0","03ffffc0","00ffff00","00ffff00","00ffff00","00ffff00","00ffff00","00ffff00","003fff00","003fff00","003ffc00","003ffc00","000ff000","000ff000","00000000","00000000","00000000","00000000","00000000","00000000"],
  "sm_Shield_6": ["00000000","00000000","00000000","00000000","00000000","00000000","00c0f0c0","00c0f0c0","00cffcc0","00cffcc0","00ffffc0","00ffffc0","003fff00","003fff00","003fffc0","003fffc0","00fffff0","00fffff0","003fffc0","003fffc0","003fff00","003fff00","003fff00","003fff00","00c3fcc0","00c3fcc0","00000000","00000000","00000000","00000000","00000000","00000000"],
  "sm_Shield_7": ["00000000","00000000","00000000","00000000","00000000","00000000","003c0f00","003c0f00","000f3c00","000f3c00","00cffcc0","00cffcc0","003fff00","003fff00","00f3c3c0","00f3c3c0","00ffffc0","00ffffc0","00ffffc0","00ffffc0","00ffffc0","00ffffc0","003fff00","003fff00","000ffc00","000ffc00","00000000","00000000","00000000","00000000","00000000","00000000"],
  "sm_Shield_8": ["00000000","00000000","00000000","00000000","00000000","00000000","00000000","00000000","03000300","03000300","03cfcf00","03cfcf00","03ffff00","03ffff00","03ffff00","03ffff00","00fffc00","00fffc00","03fffc00","03fffc00","00cffc00","00cffc00","003ff000","003ff000","000fc000","000fc000","00000000","00000000","00000000","00000000","00000000","00000000"],
  "sm_sword_1": ["00000000","00000000","00000000","00000000","00000000","00000000","00000000","00000000","00000000","00000000","0000c000","0000c000","0003c000","0003c000","0003c000","0003c000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","000ffc00","000ffc00","0003f000","0003f000","0000c000","0000c000","00000000","00000000"],
  "sm_sword_2": ["00000000","00000000","00000000","00000000","00000000","00000000","0000c000","0000c000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","0003f000","000ffc00","000ffc00","0003f000","0003f000","0000c000","0000c000","0000c000","0000c000","0000c000","0000c000"],
  "sm_sword_3": ["00000000","00000000","00000000","00000000","00000000","00000000","00030000","00030000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","00cfcc00","00cfcc00","003ff000","003ff000","000fcc00","000fcc00","003fc000","003fc000","000ff000","000ff000"],
  "sm_sword_4": ["00000000","00000000","00030000","00030000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","03cfcf00","03cfcf00","03ffff00","03ffff00","00fffc00","00fffc00","00030000","00030000","00030000","00030000","00030000","00030000"],
  "sm_sword_5": ["00000000","00000000","000f0000","000f0000","000ff000","000ff000","000ff000","000ff000","000ff000","000ff000","000fc000","000fc000","000ff000","000ff000","000fc000","000fc000","000ff000","000ff000","00ffff00","00ffff00","0fffff00","0fffff00","0fffff00","0fffff00","00ffff00","00ffff00","00ffc000","00ffc000","000f0000","000f0000","00030000","00030000"],
  "sm_sword_6": ["00030000","00030000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","000fc000","030fc300","030fc300","03ffff00","03ffff00","00fffc00","00fffc00","003ff000","003ff000","00030000","00030000","00000000","00000000"],
  "sm_sword_7": ["00000000","00000000","00000000","00000000","00000000","00000000","0000c000","0000c000","0000c000","0000c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","00c3c300","00c3c300","0033cc00","0033cc00","030ff0c0","030ff0c0","00ffff00","00ffff00","003ffc00","003ffc00","0003c000","0003c000","0003c000","0003c000"],
  "sm_sword_8": ["00000000","00000000","000c0000","000c0000","00030000","00030000","00030000","00030000","000f0000","000f0000","000f0000","000f0000","000f0000","000f0000","000f0000","000f0000","030f0300","030f0300","00ff3c00","00ff3c00","0cff30c0","0cff30c0","033ff300","033ff300","03ffff00","03ffff00","00fffc00","00fffc00","000f0000","000f0000","000f0000","000f0000"],
  "sword_1": ["00000000","00000000","00000000","00000000","00000000","00000000","00018000","00018000","0001c000","0001c000","0001c000","0001c000","0001c000","0001c000","0001c000","0001c000","0001c000","0001c000","0001c000","0001c000","0005d000","00049800","00022000","00002000","00000000","00008000","00008000","00008000","00000000","00000000","00000000","00000000"],
  "sword_3": ["00000000","00000000","00000000","00018000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","004ff200","007ffe00","003ffc00","001ff800","000ff000","000fe000","0007c000","0001c000","0001e000","00018000","00018000","00000000","00000000"],
  "sword_4": ["00000000","00000000","00018000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0003c000","0083c100","00c38300","00c6e300","002ff400","0047e200","0033cc00","00218400","00000000","00018000","00018000","00018000","00000000"],
  "sword_5": ["00018000","00018000","0003c000","0003c000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0047e200","0067e600","00f7ef00","01ffff80","01ffff80","03ffffc0","03ffffc0","01ffff80","00ffff00","008ff000","0047e000","0003c000","0003c000","0003c000","0003c000","00018000"],
  "sword_6": ["00018000","0003c000","0003c000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007e000","0007f000","0007e000","0107e080","0107e080","018ff580","019ffb80","01dfff80","00ffff00","00ffff00","007ffe00","003ffc00","00019000","00018000","00018000","00000000"],
  "sword_7": ["00000000","00008000","00008000","00008000","0011c000","0001c000","0001c000","0001c000","0003e000","0003e000","0003e000","0003e000","0003e000","0003e000","0003e000","0003e000","0023e000","0033e600","0013e600","003bec00","000ffc00","004ffc80","00dffdc0","003fef00","000ffc00","0006c800","00000800","0000c000","0000c000","0000c000","00000000","00000000"],
  "sword_8": ["00000000","00010000","00010000","00010000","00038000","00038000","00038000","00038000","0007c000","0007c000","0007c000","0007c000","0087c200","0087c200","0047c400","0147c500","00e7ce00","00f7de00","0077dc00","025ffc40","013fe880","01bff980","01ffff80","00ffff00","007ffe00","001ff800","000ff000","0003c000","0003c000","0003c000","00018000","00020000"],
}

const SWORD_STENCIL_NAMES = ["sm_sword_1","sm_sword_2","sm_sword_3","sm_sword_4","sm_sword_5","sm_sword_6","sm_sword_7","sm_sword_8","sword_1","sword_3","sword_4","sword_5","sword_6","sword_7","sword_8"]
const SHIELD_STENCIL_NAMES = ["sm_Shield_4","sm_Shield_5","sm_Shield_6","sm_Shield_7","sm_Shield_8"]

// ── Pipeline Helpers ──────────────────────────────────────────────────────────

function hashWord(word: string): number {
  let h = 0
  for (let i = 0; i < word.length; i++) h = ((h * 31) + word.charCodeAt(i)) >>> 0
  return h
}

function seededRandom(seed: number, x: number, y: number): number {
  const n = seed * 1000 + y * G + x
  return (Math.abs(Math.sin(n) * 43758.5453)) % 1
}

function classifyCard(word: string): string {
  const w = word.toLowerCase()
  if (w.includes('sword') || w.includes('blade') || w.includes('dagger')) return 'sword'
  if (w.includes('shield') || w.includes('buckler') || w.includes('aegis')) return 'shield'
  if (w.includes('bow') || w.includes('arrow')) return 'bow'
  if (w.includes('chakram') || w.includes('ring')) return 'chakram'
  if (w.includes('potion') || w.includes('vial') || w.includes('flask')) return 'potion'
  if (w.includes('plant') || w.includes('root') || w.includes('bloom') || w.includes('vine')) return 'plant'
  if (w.includes('specter') || w.includes('wraith') || w.includes('phantom')) return 'specter'
  if (w.includes('golem') || w.includes('beast') || w.includes('titan') || w.includes('bone')) return 'monster'
  if (w.includes('tome') || w.includes('orb') || w.includes('spell') || w.includes('void') ||
      w.includes('shadow') || w.includes('soul') || w.includes('hex') || w.includes('ruin') ||
      w.includes('bane') || w.includes('dread')) return 'magic'
  return 'generic'
}

type BlendOp = 'multiply' | 'lighter' | 'source-over'
interface PhysicsParams { blend: BlendOp; warp: number; particleChaos: number }

function getPhysicsParams(cardType: string): PhysicsParams {
  if (['sword', 'shield', 'bow', 'chakram'].includes(cardType))
    return { blend: 'multiply', warp: 0.5, particleChaos: 0 }
  if (['magic', 'monster', 'specter', 'plant', 'potion'].includes(cardType))
    return { blend: 'lighter', warp: 4.5, particleChaos: 0.20 }
  return { blend: 'source-over', warp: 1.0, particleChaos: 0.08 }
}

function newMask(): boolean[][] {
  return Array.from({ length: G }, () => new Array<boolean>(G).fill(false))
}

function getMorphedStancer(cardType: string, wordPart: string, seed: number, tier: number): boolean[][] {
  const mask = newMask()

  if (cardType === 'sword') {
    const name = SWORD_STENCIL_NAMES[seed % SWORD_STENCIL_NAMES.length]
    const rows = UPLOADED_STENCILS[name]
    for (let y = 0; y < G && y < rows.length; y++) {
      const val = parseInt(rows[y], 16)
      for (let x = 0; x < G; x++) mask[y][x] = Boolean((val >>> (31 - x)) & 1)
    }
    if (tier >= 2) {
      const cgShift = ((seed >> 3) % 3) - 1
      for (let y = 14; y < 18; y++) {
        if (cgShift > 0) mask[y] = [false, ...mask[y].slice(0, 31)]
        else if (cgShift < 0) mask[y] = [...mask[y].slice(1), false]
      }
      if ((seed >> 6) & 1) {
        for (let y = 4; y < 12; y++) {
          for (let x = 1; x < G - 1; x++) {
            if (!mask[y][x] && (mask[y][x - 1] || mask[y][x + 1])) mask[y][x] = true
          }
        }
      }
    }
    if (tier >= 3) {
      let tipRow = -1
      for (let y = 0; y < G; y++) { if (mask[y].some(Boolean)) { tipRow = y; break } }
      if (tipRow > 1) {
        const tipCols = mask[tipRow].reduce<number[]>((acc, v, i) => v ? [...acc, i] : acc, [])
        if (tipCols.length > 0) {
          const cx = Math.round(tipCols.reduce((a, b) => a + b, 0) / tipCols.length)
          if (cx - 2 >= 0) mask[tipRow - 1][cx - 2] = true
          if (cx + 2 < G) mask[tipRow - 1][cx + 2] = true
        }
      }
      for (let y = 14; y < 18; y++) {
        let left = -1, right = -1
        for (let x = 0; x < G; x++) { if (mask[y][x]) { left = x; break } }
        for (let x = G - 1; x >= 0; x--) { if (mask[y][x]) { right = x; break } }
        if (left >= 0) for (let d = 1; d <= 3; d++) { if (left - d >= 0) mask[y][left - d] = true }
        if (right >= 0) for (let d = 1; d <= 3; d++) { if (right + d < G) mask[y][right + d] = true }
      }
    }
    return mask
  }

  if (cardType === 'shield') {
    const name = SHIELD_STENCIL_NAMES[seed % SHIELD_STENCIL_NAMES.length]
    const rows = UPLOADED_STENCILS[name]
    for (let y = 0; y < G && y < rows.length; y++) {
      const val = parseInt(rows[y], 16)
      for (let x = 0; x < G; x++) mask[y][x] = Boolean((val >>> (31 - x)) & 1)
    }
    return mask
  }

  if (cardType === 'bow') {
    const depth = 3 + (seed % 3)
    for (let y = 2; y < 30; y++) {
      const t = (y - 2) / 26
      const arc = Math.round(Math.sin(t * Math.PI) * depth)
      const lx = 5 + arc, rx = 26 - arc
      if (lx >= 0 && lx < G) { mask[y][lx] = true; if (lx + 1 < G) mask[y][lx + 1] = true }
      if (rx >= 0 && rx < G) { mask[y][rx] = true; if (rx - 1 >= 0) mask[y][rx - 1] = true }
    }
    for (let x = 9; x <= 22; x++) mask[15][x] = true
    mask[14][22] = true; mask[15][23] = true; mask[16][22] = true
    mask[13][22] = true; mask[15][24] = true; mask[17][22] = true
    return mask
  }

  if (cardType === 'chakram') {
    const innerR = 6 + (seed % 3)
    const outerR = 12 + (seed % 3)
    for (let y = 0; y < G; y++)
      for (let x = 0; x < G; x++) {
        const d = Math.hypot(x - 15.5, y - 15.5)
        mask[y][x] = d >= innerR && d <= outerR
      }
    return mask
  }

  if (cardType === 'potion') {
    for (let y = 2; y <= 11; y++) for (let x = 14; x <= 17; x++) mask[y][x] = true
    for (let y = 12; y < 30; y++) {
      const half = Math.min(Math.round(2 + (y - 12) * 1.2), 11)
      for (let x = 16 - half; x <= 16 + half; x++) if (x >= 0 && x < G) mask[y][x] = true
    }
    if (tier >= 3) for (let y = 4; y <= 11; y++) for (let x = 18; x <= 21; x++) if (x < G) mask[y][x] = true
    return mask
  }

  if (cardType === 'plant') {
    const podR = tier >= 3 ? 4 : 3
    for (let y = 16 - podR; y <= 16 + podR; y++)
      for (let x = 16 - podR; x <= 16 + podR; x++)
        if (y >= 0 && y < G && x >= 0 && x < G) mask[y][x] = true
    const n = tier >= 3 ? 8 : 6
    const angles = Array.from({ length: n }, (_, i) => i * (2 * Math.PI / n))
    const len = 12 + (seed % 4)
    for (const angle of angles) {
      for (let r = 0; r < len; r++) {
        const tx = Math.round(15.5 + Math.cos(angle) * (podR + 1 + r))
        const ty = Math.round(15.5 + Math.sin(angle) * (podR + 1 + r))
        if (tx >= 0 && tx < G && ty >= 0 && ty < G) mask[ty][tx] = true
      }
    }
    return mask
  }

  if (cardType === 'specter') {
    const wb = tier >= 3 ? 2 : 0
    for (let y = 3; y <= 16; y++) {
      const half = Math.round(1 + (y - 3) * 0.55) + wb
      for (let x = 16 - half; x <= 16 + half; x++) if (x >= 0 && x < G) mask[y][x] = true
    }
    const txArr = tier >= 3 ? [12, 14, 16, 18, 13, 17] : [13, 15, 17, 19]
    for (let i = 0; i < txArr.length; i++) {
      const len = 10 + ((seed >> (i * 4)) % 5)
      for (let r = 0; r < len; r++) {
        const ty = 17 + r
        const tx = txArr[i] + Math.round(Math.sin(r * 0.8) * 1.5)
        if (tx >= 0 && tx < G && ty < G) mask[ty][tx] = true
      }
    }
    return mask
  }

  if (cardType === 'monster') {
    const ho = (seed % 3) - 1
    for (let y = 3; y <= 9; y++)
      for (let x = Math.max(0, 10 + ho); x <= Math.min(G - 1, 21 + ho); x++) mask[y][x] = true
    for (let y = 10; y <= 20; y++) for (let x = 7; x <= 24; x++) mask[y][x] = true
    for (const lx of [8, 13, 18, 23]) {
      for (let y = 21; y <= 29; y++) { mask[y][lx] = true; if (lx + 1 < G) mask[y][lx + 1] = true }
    }
    if (tier >= 3) {
      for (let i = 0; i < 3; i++) {
        const sx = 9 + i * 5
        for (let y = 5; y <= 9; y++) for (let x = sx; x < sx + 3 && x < G; x++) mask[y][x] = true
      }
    }
    return mask
  }

  if (cardType === 'magic') {
    for (let y = 13; y <= 18; y++) for (let x = 13; x <= 18; x++) mask[y][x] = true
    const r1 = 8 + ((seed >> 2) % 3)
    const r2 = 12 + ((seed >> 4) % 3)
    const r3 = tier >= 3 ? 15 + ((seed >> 6) % 2) : -1
    for (let y = 0; y < G; y++)
      for (let x = 0; x < G; x++) {
        const d = Math.hypot(x - 15.5, y - 15.5)
        if (Math.abs(d - r1) < 1.2 || Math.abs(d - r2) < 1.2 || (r3 > 0 && Math.abs(d - r3) < 1.2))
          mask[y][x] = true
      }
    return mask
  }

  // Generic: diamond shape based on seed
  const size = 8 + (seed % 4)
  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++)
      if (Math.abs(x - 16) + Math.abs(y - 16) <= size) mask[y][x] = true
  return mask
}

function runPipeline(
  ctx: CanvasRenderingContext2D,
  craftKey: string,
  element: GameElement,
  isBoss: boolean
): void {
  const SIZE = G
  const parts = craftKey.split('+')
  const tier = parts.length
  const wordPart = parts[0]
  const lastPart = parts[parts.length - 1]
  const activeElement: GameElement = (lastPart in PALETTE) ? lastPart as GameElement : element
  const pal = tier === 1 ? PALETTE['stone'] : PALETTE[activeElement]
  const seed = hashWord(wordPart)

  const mask = newMask()
  let blend: BlendOp = 'source-over'
  let warp = 1.0
  let particleChaos = 0.08

  if (isBoss) {
    const char = HANJA[element] ?? FALLBACK_HANJA[hashWord(element) % FALLBACK_HANJA.length]
    const off = document.createElement('canvas')
    off.width = SIZE; off.height = SIZE
    const octx = off.getContext('2d')
    if (octx) {
      octx.clearRect(0, 0, SIZE, SIZE)
      octx.fillStyle = '#ffffff'
      octx.font = 'bold 20px serif'
      octx.textAlign = 'center'
      octx.textBaseline = 'middle'
      octx.fillText(char, SIZE / 2, SIZE / 2)
      const imgData = octx.getImageData(0, 0, SIZE, SIZE)
      let sumX = 0, sumY = 0, count = 0
      for (let gy = 0; gy < SIZE; gy++)
        for (let gx = 0; gx < SIZE; gx++)
          if (imgData.data[(gy * SIZE + gx) * 4 + 3] > 50) { sumX += gx; sumY += gy; count++ }
      const offX = count > 0 ? Math.round(SIZE / 2 - sumX / count) : 0
      const offY = count > 0 ? Math.round(SIZE / 2 - sumY / count) : 0
      octx.clearRect(0, 0, SIZE, SIZE)
      octx.fillText(char, SIZE / 2 + offX, SIZE / 2 + offY)
      const fd = octx.getImageData(0, 0, SIZE, SIZE)
      for (let gy = 0; gy < SIZE; gy++)
        for (let gx = 0; gx < SIZE; gx++)
          mask[gy][gx] = fd.data[(gy * SIZE + gx) * 4 + 3] > 50
    }
    blend = 'lighter'; warp = 4.5; particleChaos = 0.15
  } else {
    const cardType = classifyCard(wordPart)
    const src = getMorphedStancer(cardType, wordPart, seed, tier)
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) mask[y][x] = src[y][x]
    const phys = getPhysicsParams(cardType)
    blend = phys.blend; warp = phys.warp; particleChaos = phys.particleChaos
  }

  // Intersection Welding Pass
  for (let y = 1; y < SIZE - 1; y++)
    for (let x = 1; x < SIZE - 1; x++)
      if (!mask[y][x]) {
        const up = mask[y - 1][x], dn = mask[y + 1][x], lt = mask[y][x - 1], rt = mask[y][x + 1]
        if ((up && rt) || (up && lt) || (dn && rt) || (dn && lt)) mask[y][x] = true
      }

  // Warp displacement
  const warpAmp = warp > 1 ? 2 : 0
  const warped = newMask()
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      if (mask[y][x]) {
        const wx = Math.round(x + Math.sin((y + seed * 0.001) * 0.5) * warpAmp)
        const wy = Math.round(y + Math.cos((x + seed * 0.001) * 0.5) * warpAmp)
        if (wx >= 0 && wx < SIZE && wy >= 0 && wy < SIZE) warped[wy][wx] = true
      }

  // Unified edge sweep
  const edges = newMask()
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      if (!warped[y][x]) {
        const nb = (warped[y - 1]?.[x] ?? false) || (warped[y + 1]?.[x] ?? false) ||
                   (warped[y]?.[x - 1] ?? false) || (warped[y]?.[x + 1] ?? false)
        if (nb) edges[y][x] = true
      }

  // Render
  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = pal.bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = pal.shadow
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      if (edges[y][x]) ctx.fillRect(x, y, 1, 1)

  ctx.globalCompositeOperation = blend
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      if (warped[y][x]) {
        const interior = (warped[y - 1]?.[x] ?? false) && (warped[y + 1]?.[x] ?? false) &&
                         (warped[y]?.[x - 1] ?? false) && (warped[y]?.[x + 1] ?? false)
        ctx.fillStyle = interior ? pal.mid : pal.core
        ctx.fillRect(x, y, 1, 1)
      }

  if (particleChaos > 0) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = pal.bright
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++)
        if (!warped[y][x]) {
          const nb = (warped[y - 1]?.[x] ?? false) || (warped[y + 1]?.[x] ?? false) ||
                     (warped[y]?.[x - 1] ?? false) || (warped[y]?.[x + 1] ?? false)
          if (nb && seededRandom(seed, x, y) < particleChaos) ctx.fillRect(x, y, 1, 1)
        }
  }

  ctx.globalCompositeOperation = 'source-over'
}

// ── PixelSprite ───────────────────────────────────────────────────────────────

interface PixelSpriteProps { craftKey: string; element: GameElement; isBoss: boolean }

function PixelSprite({ craftKey, element, isBoss }: PixelSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    runPipeline(ctx, craftKey, element, isBoss)
  }, [craftKey, element, isBoss])
  return (
    <canvas
      ref={canvasRef}
      width={G}
      height={G}
      style={{
        imageRendering: 'pixelated',
        width: isBoss ? '128px' : '48px',
        height: isBoss ? '128px' : '48px',
      }}
    />
  )
}

// ── ActionButton ──────────────────────────────────────────────────────────────

interface ActionButtonProps { label: string; onClick: () => void; disabled: boolean }

function ActionButton({ label, onClick, disabled }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left px-1 py-0.5 rounded text-[10px]
        hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {label}
    </button>
  )
}

// ── CardPopover ───────────────────────────────────────────────────────────────

interface CardPopoverProps {
  card: Card
  selectedElement: GameElement | null
  closeMenu: () => void
  onHoverCraft: (tip: string | null) => void
  hoverTooltip: string | null
  executeAttack: (id: string) => void
  discardCard: (id: string) => void
  craftCards: (el: GameElement, id: string) => Promise<void>
  checkHoverCache: (key: string) => DatabankEntry | null
  combatPhase: string
}

function CardPopover({
  card, selectedElement, closeMenu, onHoverCraft, hoverTooltip,
  executeAttack, discardCard, craftCards, checkHoverCache, combatPhase,
}: CardPopoverProps) {
  const sellValue = card.rarity === 'common' ? 1
    : card.rarity === 'cursed' ? 0
    : Math.ceil(card.purchasePrice / 2)

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-20
      bg-neutral-900 border border-neutral-600 rounded shadow-xl p-1 flex flex-col gap-0.5 w-24">
      <ActionButton
        label="⚔ Attack"
        onClick={() => { executeAttack(card.id); closeMenu() }}
        disabled={combatPhase !== 'PLAYER_TURN'}
      />
      <ActionButton
        label={`✕ Sell (${sellValue}g)`}
        onClick={() => { discardCard(card.id); closeMenu() }}
        disabled={card.isScalingDagger}
      />
      <div
        className="relative"
        onMouseEnter={() => {
          if (selectedElement && card.itemType === 'word') {
            const ck = `${card.word}+${selectedElement}`
            const cached = checkHoverCache(ck)
            onHoverCraft(cached ? `${cached.name}: ${cached.lore}` : `Forge ${card.word}+${selectedElement}?`)
          }
        }}
        onMouseLeave={() => onHoverCraft(null)}
      >
        <ActionButton
          label="⚗ Craft"
          onClick={() => { void craftCards(selectedElement!, card.id); closeMenu() }}
          disabled={!selectedElement || card.itemType !== 'word' || card.isScalingDagger}
        />
        {hoverTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-40
            bg-neutral-800 border border-neutral-600 rounded p-1 text-[9px] text-neutral-300 z-30">
            {hoverTooltip}
          </div>
        )}
      </div>
    </div>
  )
}

// ── CardSlot ──────────────────────────────────────────────────────────────────

interface CardSlotProps {
  card: Card | null
  slotIndex: number
  isSelected: boolean
  selectedElement: GameElement | null
  isCrafting: boolean
  onSelect: (id: string | null) => void
  closeMenu: () => void
  onHoverCraft: (tip: string | null) => void
  hoverTooltip: string | null
  executeAttack: (id: string) => void
  discardCard: (id: string) => void
  craftCards: (el: GameElement, id: string) => Promise<void>
  checkHoverCache: (key: string) => DatabankEntry | null
  combatPhase: string
}

function CardSlot({
  card, slotIndex, isSelected, selectedElement, isCrafting,
  onSelect, closeMenu, onHoverCraft, hoverTooltip,
  executeAttack, discardCard, craftCards, checkHoverCache, combatPhase,
}: CardSlotProps) {
  if (card === null) {
    return (
      <div
        aria-label={`Empty slot ${slotIndex}`}
        className="w-20 h-28 border border-dashed border-neutral-700 rounded shrink-0"
      />
    )
  }

  const spriteElement: GameElement = card.element ?? 'stone'
  const isDagger = slotIndex === 0

  return (
    <div
      className={[
        'relative w-20 h-28 border-2 rounded shrink-0 flex flex-col items-center p-1 cursor-pointer',
        RARITY_BORDER[card.rarity],
        isDagger ? 'ring-1 ring-amber-400/50' : '',
        isSelected ? 'ring-2 ring-white' : '',
        isCrafting ? 'opacity-40 pointer-events-none' : '',
      ].join(' ')}
      onClick={() => onSelect(isSelected ? null : card.id)}
    >
      <PixelSprite
        craftKey={card.craftKey ?? card.word}
        element={spriteElement}
        isBoss={false}
      />
      <p className="text-[10px] truncate w-full text-center mt-0.5 leading-none">{card.word}</p>
      <p className="text-sm font-bold text-white leading-none">{card.baseStat}</p>
      {card.element && (
        <p className={`text-[9px] leading-none ${ELEMENT_TEXT[card.element]}`}>{card.element}</p>
      )}
      <p className="text-[9px] text-neutral-500 leading-none">{card.rarity}</p>

      {isSelected && !isCrafting && (
        <CardPopover
          card={card}
          selectedElement={selectedElement}
          closeMenu={closeMenu}
          onHoverCraft={onHoverCraft}
          hoverTooltip={hoverTooltip}
          executeAttack={executeAttack}
          discardCard={discardCard}
          craftCards={craftCards}
          checkHoverCache={checkHoverCache}
          combatPhase={combatPhase}
        />
      )}
    </div>
  )
}

// ── ElementTile ───────────────────────────────────────────────────────────────

interface ElementTileProps {
  el: GameElement
  active?: boolean
  exhausted?: boolean
  onClick?: () => void
  disabled?: boolean
  title?: string
}

function ElementTile({ el, active, exhausted, onClick, disabled, title }: ElementTileProps) {
  const className = [
    'w-14 h-14 text-2xl rounded border transition-colors font-bold leading-none flex items-center justify-center',
    ELEMENT_TEXT[el],
    active ? 'border-white bg-neutral-800' : 'border-neutral-700',
    exhausted ? 'opacity-25' : onClick ? 'hover:bg-neutral-800' : '',
  ].join(' ')

  if (onClick) {
    return (
      <button onClick={onClick} disabled={disabled} title={title} className={className}>
        {HANJA[el] ?? el}
      </button>
    )
  }

  return (
    <div title={title} className={className}>
      {HANJA[el] ?? el}
    </div>
  )
}

// ── Module-Level Helpers ──────────────────────────────────────────────────────

function xpToNext(level: number): number { return level * 4 }

function getShopCapacity(level: number): { wordSlots: number; itemSlots: number } {
  if (level >= 50) return { wordSlots: 5, itemSlots: 3 }
  if (level >= 30) return { wordSlots: 4, itemSlots: 2 }
  if (level >= 10) return { wordSlots: 3, itemSlots: 2 }
  return { wordSlots: 3, itemSlots: 1 }
}

const MOCK_ITEMS = [
  { id: 'item-1', name: 'Ward Rune',   desc: 'Block 30 damage',    cost: 3, icon: '🛡️' },
  { id: 'item-2', name: 'Ember Sigil', desc: '+20% fire damage',   cost: 4, icon: '🔥' },
  { id: 'item-3', name: 'Venom Brand', desc: 'Poison: 5 dmg/turn', cost: 3, icon: '☠️' },
]

function buyMerchantXP(
  gold: number,
  mLevel: number,
  mXP: number,
  setLevel: (n: number) => void,
  setXP: (n: number) => void,
  upgradeShopLevel: () => void,
  shopLevel: number,
): void {
  if (gold < 4) return
  useGameStore.setState(s => ({ gold: s.gold - 4 }))
  const newXP = mXP + 4
  const needed = xpToNext(mLevel)
  if (newXP >= needed) {
    setLevel(mLevel + 1)
    setXP(newXP - needed)
    if (shopLevel < 5) upgradeShopLevel()
  } else {
    setXP(newXP)
  }
}

// ── GameLayout ────────────────────────────────────────────────────────────────

export default function GameLayout() {
  // ── Store selectors ───────────────────────────────────────────────────────
  const hand              = useGameStore(s => s.hand)
  const storyLog          = useGameStore(s => s.storyLog)
  const gold              = useGameStore(s => s.gold)
  const playerHP          = useGameStore(s => s.playerHP)
  const playerMaxHP       = useGameStore(s => s.playerMaxHP)
  const timesHealed       = useGameStore(s => s.timesHealed)
  const hpPactPurchases   = useGameStore(s => s.hpPactPurchases)
  const shopLevel         = useGameStore(s => s.shopLevel)
  const shopCards         = useGameStore(s => s.shopCards)
  const bossHP            = useGameStore(s => s.bossHP)
  const bossMaxHP         = useGameStore(s => s.bossMaxHP)
  const bossElement       = useGameStore(s => s.bossElement)
  const combatPhase       = useGameStore(s => s.combatPhase)
  const turnCount         = useGameStore(s => s.turnCount)
  const isCrafting        = useGameStore(s => s.isCrafting)
  const elements          = useGameStore(s => s.elements)
  const exhaustedElements = useGameStore(s => s.exhaustedElements)
  const currentLevel      = useGameStore(s => s.currentLevel)
  const lootCards         = useGameStore(s => s.lootCards)

  const executeAttack    = useGameStore(s => s.executeAttack)
  const discardCard      = useGameStore(s => s.discardCard)
  const craftCards       = useGameStore(s => s.craftCards)
  const checkHoverCache  = useGameStore(s => s.checkHoverCache)
  const healAtCampfire   = useGameStore(s => s.healAtCampfire)
  const upgradeShopLevel = useGameStore(s => s.upgradeShopLevel)
  const buyHPWithGold    = useGameStore(s => s.buyHPWithGold)
  const rerollShop       = useGameStore(s => s.rerollShop)
  const draftLootCard    = useGameStore(s => s.draftLootCard)
  const advanceLevel     = useGameStore(s => s.advanceLevel)
  const restartGame      = useGameStore(s => s.restartGame)
  const buyCard          = useGameStore(s => s.buyCard)

  // ── Local state ───────────────────────────────────────────────────────────
  const [selectedCardId, setSelectedCardId]     = useState<string | null>(null)
  const [selectedElement, setSelectedElement]   = useState<GameElement | null>(null)
  const [hoverTooltip, setHoverTooltip]         = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen]             = useState(false)
  const [marketViewMode, setMarketViewMode]     = useState<'shop' | 'vault'>('shop')
  const [merchantLevel, setMerchantLevel]       = useState(1)
  const [merchantXP, setMerchantXP]             = useState(0)
  const [selectedInvIds, setSelectedInvIds]     = useState<string[]>([])
  const [equippedItems, setEquippedItems]         = useState<typeof MOCK_ITEMS>([])
  const [hoveredBuffId, setHoveredBuffId]         = useState<string | null>(null)
  const [confirmingBloodPact, setConfirmingBloodPact] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => {
    setSelectedCardId(null)
    setSelectedElement(null)
    setHoverTooltip(null)
  }, [])

  useEffect(() => { closeMenu() }, [isCrafting, combatPhase, closeMenu])
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [storyLog])

  const handFull = useMemo(() => hand.filter(Boolean).length >= 6, [hand])
  const healCost = 2 + timesHealed
  const capacity = getShopCapacity(merchantLevel)
  const canForge = selectedInvIds.length === 2 && selectedElement !== null

  const totalSellValue = useMemo(() => {
    return selectedInvIds.reduce((sum, id) => {
      const card = hand.find(c => c?.id === id)
      if (!card) return sum
      if (card.rarity === 'common') return sum + 1
      if (card.rarity === 'cursed') return sum
      return sum + Math.ceil(card.purchasePrice / 2)
    }, 0)
  }, [selectedInvIds, hand])

  function toggleInvCard(id: string) {
    setSelectedInvIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 2 ? [...prev, id] : prev
    )
  }

  function handleForge() {
    if (!canForge) return
    const cardA = hand.find(c => c?.id === selectedInvIds[0])
    const cardB = hand.find(c => c?.id === selectedInvIds[1])
    if (cardA && cardB) {
      const combinedKey = `${cardA.craftKey ?? cardA.word}+${cardB.craftKey ?? cardB.word}+${selectedElement}`
      const baseWord = `${cardA.word}${cardB.word.toLowerCase()}`
      useGameStore.setState(s => {
        const updatedHand = [...s.hand]
        const idxA = updatedHand.findIndex(c => c?.id === cardA.id)
        const idxB = updatedHand.findIndex(c => c?.id === cardB.id)
        if (idxA !== -1) {
          updatedHand[idxA] = {
            ...cardA,
            word: baseWord,
            craftKey: combinedKey,
            element: selectedElement!,
            baseStat: cardA.baseStat + cardB.baseStat + 5,
            rarity: 'epic',
          }
        }
        if (idxB !== -1) updatedHand[idxB] = null
        return {
          hand: updatedHand,
          storyLog: [...s.storyLog, { id: crypto.randomUUID(), message: `Forged: ${cardA.word} and ${cardB.word} synthesized into ${baseWord}!` }]
        }
      })
    }
    setSelectedInvIds([])
  }

  function handleMultiSell() {
    selectedInvIds.forEach(id => discardCard(id))
    setSelectedInvIds([])
  }

  function handleBuyXP() {
    buyMerchantXP(gold, merchantLevel, merchantXP, setMerchantLevel, setMerchantXP, upgradeShopLevel, shopLevel)
  }

  // ── Overlay screens ───────────────────────────────────────────────────────

  if (combatPhase === 'GAME_OVER') {
    return (
      <div className="h-screen w-screen bg-neutral-950 flex flex-col items-center justify-center gap-6 font-mono text-neutral-200 select-none">
        <p className="text-2xl text-rose-500 tracking-widest">GAME OVER</p>
        <p className="text-sm text-neutral-500">Reached Level {currentLevel}</p>
        <button
          onClick={restartGame}
          className="px-6 py-2 border border-neutral-600 rounded hover:bg-neutral-800 text-sm transition-colors"
        >
          ↺ Restart
        </button>
      </div>
    )
  }

  if (combatPhase === 'POST_BOSS_LOOT' && lootCards) {
    return (
      <div className="h-screen w-screen bg-neutral-950 flex flex-col items-center justify-center gap-6 font-mono text-neutral-200 select-none">
        <p className="text-lg text-amber-400 tracking-widest">CHOOSE YOUR SPOILS</p>
        <div className="flex gap-6">
          {lootCards.map((card, i) => (
            <div
              key={card.id}
              onClick={() => draftLootCard(i)}
              className={`border-2 ${RARITY_BORDER[card.rarity]} rounded p-4 cursor-pointer hover:bg-neutral-900 flex flex-col items-center gap-2 transition-colors`}
            >
              <PixelSprite craftKey={card.craftKey ?? card.word} element={card.element ?? 'stone'} isBoss={false} />
              <p className="text-sm font-bold">{card.word}</p>
              <p className="text-xs text-neutral-400">{card.baseStat} atk</p>
              <p className="text-xs text-neutral-500">{card.rarity}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-neutral-200 overflow-hidden font-mono select-none">

      {/* ── Left Panel ─────────────────────────────────────────────────── */}
      <div className="w-1/4 shrink-0 h-full flex flex-col bg-neutral-950 border-r border-neutral-800 p-4">
        <div className="shrink-0 mb-40 text-xs text-neutral-500 border border-neutral-800 rounded px-2 py-1">
          [ SYSTEM ] Lv.{currentLevel} | Turn {turnCount}
        </div>
        <div
          ref={logRef}
          className="shrink-0 h-[27%] mb-40 overflow-y-auto border border-neutral-800 p-4 bg-neutral-950/50 space-y-1"
        >
          {storyLog.map((entry: LogEntry) => (
            <p key={entry.id} className="text-xs text-neutral-400 leading-relaxed">
              {entry.message}
            </p>
          ))}
          {storyLog.length === 0 && (
            <p className="text-xs text-neutral-600 italic">Awaiting your first move...</p>
          )}
        </div>
        <div className="shrink-0 h-[45%] pb-4">
          <p className="text-[10px] text-neutral-600 mb-2 tracking-widest">ELEMENTS</p>
          <div className="grid grid-cols-6 gap-1">
            {elements.map((el: GameElement) => {
              const exhausted = exhaustedElements.includes(el)
              const active = selectedElement === el
              return (
                <ElementTile
                  key={el}
                  el={el}
                  active={active}
                  exhausted={exhausted}
                  disabled={exhausted || isCrafting}
                  title={el}
                  onClick={() => setSelectedElement(active ? null : el)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Center Arena ───────────────────────────────────────────────── */}
      <div className="flex-1 bg-neutral-950/40 p-6 flex flex-col justify-center gap-32 overflow-hidden relative">

        {/* Boss field */}
        <div className="flex flex-col items-center gap-24">
          <div className="relative flex items-center justify-center gap-8">
            <p className="text-[20px] tracking-widest text-neutral-500 uppercase">
              {BOSS_TITLES[bossElement]}
            </p>
            <ElementTile el={bossElement} title={bossElement} />
          </div>
          <div className="flex flex-col items-center gap-6">
            <PixelSprite craftKey={bossElement} element={bossElement} isBoss={true} />
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-48 h-2 bg-neutral-800 rounded overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-300"
                  style={{ width: `${Math.max(0, (bossHP / bossMaxHP) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-neutral-400 tabular-nums">{bossHP} / {bossMaxHP}</p>
            </div>
          </div>
          {/* <p className={`text-xs ${turnCount >= 8 ? 'text-red-400 animate-pulse' : 'text-neutral-500'}`}>
            //TURN {turnCount}
          </p> */}
        </div>

        {/* Player HUD */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="flex flex-col items-center gap-3">
            <div className="w-full max-w-lg flex items-center gap-1">
              <span className="text-xs text-neutral-400 shrink-0 tabular-nums w-20 text-right">
                {playerHP}/{playerMaxHP}
              </span>
              <div className="flex-1 h-3 bg-neutral-800 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, (playerHP / playerMaxHP) * 100)}%` }}
                />
              </div>
              <button
                onClick={() => {
                  if (combatPhase === 'IDLE') {
                    useGameStore.setState({ combatPhase: 'PLAYER_TURN' })
                  } else if (combatPhase === 'POST_BOSS_LOOT' && !lootCards) {
                    advanceLevel()
                  } else {
                    healAtCampfire()
                  }
                }}
                disabled={
                  combatPhase === 'IDLE' ? false :
                  (combatPhase === 'POST_BOSS_LOOT' && !lootCards) ? false :
                  (gold < healCost || playerHP >= playerMaxHP || isCrafting)
                }
                className="shrink-0 flex items-center gap-1.5 px-2 py-1 border border-neutral-700 rounded text-[10px] text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors group"
              >
                <span className="w-3 h-3 border border-neutral-500 rounded-sm group-hover:border-neutral-300 transition-colors shrink-0" />
                <span>
                  {combatPhase === 'IDLE' ? '⚔ start fight' :
                   (combatPhase === 'POST_BOSS_LOOT' && !lootCards) ? '▶ next level' :
                   `⚑ heal ${healCost}g`}
                </span>
              </button>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {hand.map((card, index) => (
                <CardSlot
                  key={index}
                  card={card}
                  slotIndex={index}
                  isSelected={selectedCardId === card?.id}
                  selectedElement={selectedElement}
                  isCrafting={isCrafting}
                  onSelect={setSelectedCardId}
                  closeMenu={closeMenu}
                  onHoverCraft={setHoverTooltip}
                  hoverTooltip={hoverTooltip}
                  executeAttack={executeAttack}
                  discardCard={discardCard}
                  craftCards={craftCards}
                  checkHoverCache={checkHoverCache}
                  combatPhase={combatPhase}
                />
              ))}
            </div>
          </div>
          {isCrafting && (
            <p className="text-xs text-amber-400 tracking-widest animate-pulse">⚙ FORGING...</p>
          )}
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────────── */}
      <div className="w-1/4 shrink-0 h-full p-4 flex items-start justify-start gap-1">

        {/* Buff info tile — shows equipped buffs summary, hover for full list */}
        <div
          className="relative w-14 h-14 flex flex-col items-center justify-center bg-neutral-900 border border-neutral-700 rounded-md cursor-default"
          onMouseEnter={() => setHoveredBuffId('__buff_info')}
          onMouseLeave={() => setHoveredBuffId(null)}
        >
          <span className="text-base leading-none">
            {equippedItems.length > 0 ? equippedItems[equippedItems.length - 1].icon : '✦'}
          </span>
          <span className="text-[9px] text-amber-400 font-bold leading-none mt-0.5">
            {equippedItems.length > 0 ? `${equippedItems.length} buff${equippedItems.length > 1 ? 's' : ''}` : '—'}
          </span>
          {hoveredBuffId === '__buff_info' && (
            <div className="absolute top-full right-0 mt-2 z-50 w-52 bg-neutral-900 border border-neutral-700 rounded-md p-2 pointer-events-none shadow-xl">
              <p className="text-[10px] font-bold text-amber-300 mb-2">Active Buffs</p>
              {equippedItems.length === 0 ? (
                <p className="text-[9px] text-neutral-500 italic">No buffs equipped</p>
              ) : (
                equippedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 mb-1.5 last:mb-0">
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-[9px] font-bold text-amber-300 leading-none">{item.name}</p>
                      <p className="text-[8px] text-neutral-400 leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* HP Pact — pay gold to recover HP; cost scales with each purchase */}
        <button
          onClick={() => {
            const cost = calcHPPactCost(hpPactPurchases)
            if (isCrafting || playerHP >= playerMaxHP || gold < cost) return
            if (!confirmingBloodPact) {
              setConfirmingBloodPact(true)
            } else {
              buyHPWithGold()
              setConfirmingBloodPact(false)
            }
          }}
          className={[
            'relative w-14 h-14 flex flex-col items-center justify-center border rounded-md transition-colors',
            !isCrafting && playerHP < playerMaxHP && gold >= calcHPPactCost(hpPactPurchases)
              ? confirmingBloodPact
                ? 'bg-rose-800/60 border-rose-200 cursor-pointer'
                : 'bg-rose-950/60 border-rose-400 hover:bg-rose-900/50 hover:border-rose-300 cursor-pointer'
              : 'bg-neutral-900 border-neutral-700 opacity-40 cursor-default',
          ].join(' ')}
          onMouseEnter={() => setHoveredBuffId('__hp_pact')}
          onMouseLeave={() => { setHoveredBuffId(null); setConfirmingBloodPact(false) }}
        >
          {confirmingBloodPact ? (
            <>
              <span className="text-base leading-none">✓</span>
              <span className="text-[9px] font-bold leading-none mt-0.5 text-rose-200">confirm?</span>
            </>
          ) : (
            <>
              <span className="text-base leading-none">🩸</span>
              <span className="text-[9px] font-bold leading-none mt-0.5 text-emerald-400">
                +{HP_PACT_HEAL_AMOUNT} hp
              </span>
              <span className="text-[9px] font-bold leading-none text-amber-400">
                {calcHPPactCost(hpPactPurchases)}g
              </span>
            </>
          )}
          {hoveredBuffId === '__hp_pact' && !confirmingBloodPact && (
            <div className="absolute top-full right-0 mt-2 z-50 w-52 bg-neutral-900 border border-rose-800/60 rounded-md p-2 pointer-events-none shadow-xl">
              <p className="text-[10px] font-bold text-rose-300 mb-2">Blood Pact</p>
              <p className="text-[9px] text-neutral-400 leading-tight">
                Pay {calcHPPactCost(hpPactPurchases)}g to recover {HP_PACT_HEAL_AMOUNT} HP. Cost rises with each pact made.
              </p>
              <p className="text-[8px] text-rose-400 mt-2 border-t border-rose-900 pt-1.5">
                Pacts made: {hpPactPurchases}
              </p>
            </div>
          )}
        </button>
      </div>

      {/* ── Barn Door HUD ──────────────────────────────────────────────── */}
      <div className={`fixed top-6 bottom-8 right-0 z-40 flex transition-transform duration-300 ease-in-out
        ${drawerOpen ? 'translate-x-0' : 'translate-x-[calc(100%-5rem)]'}`}>

        {/* LEFT INNER COLUMN: bookmark tabs flush to right screen edge */}
        <div className="w-20 shrink-0 h-full flex flex-col items-stretch pt-2 gap-2 z-30">
          <button
            onClick={() => { setDrawerOpen(v => !v); if (!drawerOpen) setMarketViewMode('shop') }}
            className="h-14 flex items-center justify-center bg-neutral-900 border-y border-l border-neutral-700 rounded-l-md text-lg text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
            title={drawerOpen ? 'Close' : 'Open Shop'}
          >
            {drawerOpen ? '☆' : '☆'}
          </button>
          <div className="h-14 flex flex-col items-center justify-center bg-neutral-900 border-y border-l border-neutral-700 rounded-l-md text-amber-400 font-black">
            <div className="text-base leading-none">{gold}</div>
            <div className="text-amber-600 text-[10px] leading-none">gold</div>
          </div>
          <button
            onClick={() => { setMarketViewMode('vault'); setDrawerOpen(true) }}
            className="h-14 flex items-center justify-center bg-neutral-900 border-y border-l border-neutral-700 rounded-l-md text-xl hover:border-neutral-500 transition-colors"
            title="Open Vault"
          >
            🎒
          </button>
        </div>

        {/* RIGHT INNER COLUMN: 340px shop/vault content */}
        <div className="w-[340px] h-full bg-neutral-900 border-l border-neutral-700 flex flex-col overflow-hidden">

          {/* Header row */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
            <span className="text-xs font-bold tracking-widest text-neutral-300">
              {marketViewMode === 'shop' ? 'BLACK MARKET' : 'STORAGE VAULT'}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400">Lv.{merchantLevel}</span>
              <span className="text-neutral-500">XP: {merchantXP}/{xpToNext(merchantLevel)}</span>
              <button
                onClick={handleBuyXP}
                disabled={gold < 4}
                className="border border-amber-700 text-amber-400 px-1.5 py-0.5 rounded hover:bg-amber-950 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                +4XP (4g)
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-neutral-500 hover:text-neutral-200 transition-colors ml-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex shrink-0 border-b border-neutral-800">
            <button
              onClick={() => setMarketViewMode('shop')}
              className={`flex-1 py-2 text-xs transition-colors ${
                marketViewMode === 'shop'
                  ? 'bg-neutral-800 text-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Shop
            </button>
            <button
              onClick={() => setMarketViewMode('vault')}
              className={`flex-1 py-2 text-xs transition-colors ${
                marketViewMode === 'vault'
                  ? 'bg-neutral-800 text-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Vault
            </button>
          </div>

          {marketViewMode === 'shop' ? (
            /* ── Shop view ── */
            <div className="flex-1 overflow-y-auto px-4 space-y-6 py-4">

              <ShopOddsDisplay level={shopLevel} />

              {/* Word card shelf */}
              <section>
                <p className="text-[10px] text-neutral-500 mb-2 tracking-widest">WORDS</p>
                <div className="space-y-2">
                  {shopCards.slice(0, capacity.wordSlots).map(card => (
                    <div
                      key={card.id}
                      className="flex items-center gap-3 border border-neutral-700 rounded p-2 bg-neutral-800/30"
                    >
                      <PixelSprite craftKey={card.word} element={'stone' as GameElement} isBoss={false} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{card.word}</p>
                        <p className="text-[10px] text-neutral-400">{card.baseStat} atk · {card.rarity}</p>
                      </div>
                      <button
                        onClick={() => buyCard(card.shopSlotIndex)}
                        disabled={gold < card.purchasePrice || handFull || isCrafting}
                        className="text-xs border border-neutral-600 px-2 py-0.5 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 transition-colors"
                      >
                        {card.purchasePrice}g
                      </button>
                    </div>
                  ))}
                  {shopCards.length === 0 && (
                    <p className="text-xs text-neutral-600 italic">No words in stock.</p>
                  )}
                </div>
              </section>

              {/* Item card shelf */}
              <section>
                <p className="text-[10px] text-neutral-500 mb-2 tracking-widest">ITEMS</p>
                <div className="flex flex-wrap gap-3">
                  {MOCK_ITEMS.slice(0, capacity.itemSlots).map(item => {
                    const isEquipped = equippedItems.some(e => e.id === item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (isEquipped || gold < item.cost) return
                          useGameStore.setState(s => ({ gold: s.gold - item.cost }))
                          setEquippedItems(prev => [...prev, item])
                        }}
                        disabled={isEquipped || gold < item.cost}
                        className="w-20 h-24 disabled:cursor-default"
                      >
                        <div
                          className={[
                            'w-full h-full flex flex-col items-center justify-center p-2 transition-colors',
                            isEquipped ? 'bg-amber-900/40' : 'bg-neutral-700 hover:bg-neutral-600',
                          ].join(' ')}
                          style={{ clipPath: 'polygon(20% 0%,80% 0%,100% 20%,100% 80%,80% 100%,20% 100%,0% 80%,0% 20%)' }}
                        >
                          <p className="text-lg leading-none">{item.icon}</p>
                          <p className="text-[9px] font-bold text-center text-neutral-200 leading-tight mt-1">{item.name}</p>
                          <p className="text-[8px] text-neutral-400 text-center leading-tight mt-0.5">{item.desc}</p>
                          <p className={`text-[9px] mt-1 ${isEquipped ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isEquipped ? '✓ active' : `${item.cost}g`}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Reroll */}
              <div>
                <button
                  onClick={rerollShop}
                  disabled={gold < 2 || isCrafting}
                  className="w-full text-xs border border-neutral-700 rounded py-1.5 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ↻ Reroll Shop (2g)
                </button>
              </div>

            </div>
          ) : (
            /* ── Vault view ── */
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {hand.filter(Boolean).length === 0 ? (
                  <p className="text-xs text-neutral-600 italic text-center mt-4">Your vault is empty.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {hand.map((card) => {
                      if (!card) return null
                      const isChosen = selectedInvIds.includes(card.id)
                      return (
                        <div
                          key={`vault-${card.id}`}
                          onClick={() => toggleInvCard(card.id)}
                          className={[
                            'relative border-2 rounded p-2 cursor-pointer flex flex-col items-center gap-1 transition-colors',
                            RARITY_BORDER[card.rarity],
                            isChosen ? 'bg-neutral-800 ring-1 ring-white' : 'bg-neutral-900/50 hover:bg-neutral-800/50',
                          ].join(' ')}
                        >
                          {isChosen && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" />
                          )}
                          <PixelSprite
                            craftKey={card.craftKey ?? card.word}
                            element={card.element ?? 'stone'}
                            isBoss={false}
                          />
                          <p className="text-[10px] truncate w-full text-center">{card.word}</p>
                          <p className="text-xs font-bold">{card.baseStat}</p>
                          {card.element && (
                            <p className={`text-[9px] ${ELEMENT_TEXT[card.element]}`}>{card.element}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Anchored vault footer */}
              <div className="shrink-0 p-4 border-t border-neutral-800 flex gap-2">
                <button
                  onClick={handleForge}
                  className={[
                    'flex-1 text-xs py-2 rounded border transition-colors',
                    canForge
                      ? 'border-purple-600 text-purple-300 hover:bg-purple-950'
                      : 'border-neutral-700 text-neutral-600 opacity-20 pointer-events-none',
                  ].join(' ')}
                >
                  ⚗ Forge Pair
                </button>
                <button
                  onClick={handleMultiSell}
                  disabled={selectedInvIds.length === 0}
                  className="flex-1 text-xs py-2 rounded border border-neutral-700 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ✕ Sell ({totalSellValue}g)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
