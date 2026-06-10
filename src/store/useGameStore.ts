import { create } from 'zustand'

// ── Exported Types ────────────────────────────────────────────────────────────

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'cursed'
export type Element = 'fire' | 'water' | 'stone' | 'plant' | 'necro' | 'light'
export type CombatPhase = 'IDLE' | 'PLAYER_TURN' | 'BOSS_TURN' | 'POST_BOSS_LOOT' | 'GAME_OVER'
export type BossCombatState = 'IDLE' | 'TAKING_DAMAGE' | 'ENRAGED' | 'DEAD'
export type ItemType = 'word' | 'fused'
export type WordType = 'thematic' | 'random'

export interface Card {
  id: string
  rarity: Rarity
  element?: Element         // only present on fused cards
  itemType: ItemType        // 'word' = raw word card; 'fused' = crafted with a sidebar element
  word: string              // assigned from word pool on creation
  wordType: WordType        // 'thematic' (70%) or 'random' (30%)
  baseStat: number          // scales with ME via rarity table
  isScalingDagger: boolean
  purchasePrice: number     // common=1, rare=2, epic=3, legendary=4, cursed=0
  anvilUpgradeCount: number // tracks cost doubling: 2g → 4g → 8g
  craftKey?: string         // e.g. "shadowblade+fire" — LLM cache key
  lore?: string
  synergyMultiplier?: number
}

export interface DatabankEntry {
  name: string
  lore: string
  synergyMultiplier: number // 1.0–1.5 (mocked random on first call)
}

export interface LogEntry {
  id: string
  message: string
}

export interface ShopCard extends Card {
  shopSlotIndex: 0 | 1 | 2
}

export interface GameState {
  // Progression
  currentLevel: number
  ME: number          // 1.4^(L-1) — stored, updated on level-up
  MP: number          // 1.25^(L-1) — stored, updated on level-up
  playerMaxHP: number // floor(100 × MP × 0.85^bloodPacts)
  bossMaxHP: number   // floor(50 × ME)
  playerHP: number
  gold: number        // starts at 10

  // Blood Economy
  bloodPacts: number  // each pact decays playerMaxHP by 15% via 0.85^bloodPacts

  // Campfire
  timesHealed: number // cost = 2 + timesHealed gold per heal

  // HP Pact — gold-for-HP purchase, cost scales with each purchase
  hpPactPurchases: number

  // Boss
  bossHP: number
  bossElement: Element
  bossCombatState: BossCombatState

  // Inventory — fixed length 6; slot 0 = Scaling Dagger, never overwritten
  hand: (Card | null)[]

  // Sidebar elements — permanent, never consumed by crafting
  elements: Element[]
  exhaustedElements: Element[] // used this "turn"; cleared when executeAttack fires

  // Shop
  shopLevel: number   // 1–5
  shopCards: ShopCard[]

  // Blood Altar — only refreshes on advanceLevel(); no manual refresh action
  bloodAltarCard: Card | null

  // Combat
  combatPhase: CombatPhase
  turnCount: number   // enrage fires at turn 10

  // Post-boss loot
  lootCards: Card[] | null // 3 choices; player drafts 1

  // LLM Memoization
  databank: Record<string, DatabankEntry>

  // Async lock — true while craftCards awaits the mock LLM
  // All hand-mutating actions check this first to prevent state collisions
  isCrafting: boolean

  // Narrator story log
  storyLog: LogEntry[]
}

export interface GameActions {
  // Shop & Inventory
  buyCard: (shopSlotIndex: number) => void
  discardCard: (cardId: string) => void
  rerollShop: () => void
  upgradeShopLevel: () => void
  upgradeAnvilCard: (cardId: string) => void

  // Blood Altar
  acceptBloodPact: () => void

  // Campfire
  healAtCampfire: () => void

  // HP Pact
  buyHPWithGold: () => void

  // Combat
  executeAttack: (cardId: string) => void
  draftLootCard: (index: number) => void

  // Crafting
  craftCards: (element: Element, wordCardId: string) => Promise<void>

  // LLM / Cache
  generateCardLore: (craftKey: string) => Promise<DatabankEntry>
  checkHoverCache: (craftKey: string) => DatabankEntry | null

  // Progression
  advanceLevel: () => void
  restartGame: () => void

  // Narrator utility — inject a line from outside the store if needed
  addLog: (message: string) => void
}

// ── Private Helpers ───────────────────────────────────────────────────────────

// ── Narrator Dictionaries ─────────────────────────────────────────────────────

const LOG_HEAL = [
  "You drink the murky campfire water. It tastes like copper and bad decisions.",
  "The fire stitches your wounds, but the existential dread remains.",
]

const LOG_BLOOD = [
  "Ah, spending your literal lifeblood for a shiny new toy. I'm sure this won't backfire.",
  "Your max health drops permanently. A fair price for absolute, corrupted power, right?",
]

const LOG_VAPORIZE = [
  "CRITICAL SHATTER. You atomized the beast, but your weapon turned to dust.",
  "A spectacular elemental implosion! Your chimera is gone, but so is a chunk of the boss.",
]

const LOG_LEVEL = [
  "The boss falls. The world shifts. Things are about to get mathematically worse.",
  "Victory! Your reward is exponentially stronger enemies. Enjoy.",
]

const LOG_CRAFT = [
  "A new chimera is forged. It looks... unstable.",
  "Alchemy at its finest. Or its most reckless.",
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeLogEntry(message: string): LogEntry {
  return { id: crypto.randomUUID(), message }
}

// ── Word Pools ────────────────────────────────────────────────────────────────

const THEMATIC_WORDS = [
  'shadowblade', 'voidwhisper', 'bonechill', 'ashveil', 'dreadforge',
  'soulrift', 'grimhallow', 'nightweave', 'cursedge', 'phantomblight',
  'deathknell', 'ruinmark', 'wraithsong', 'emberbane', 'hexshield',
]

const RANDOM_WORDS = [
  'bucket', 'spanner', 'lantern', 'cobble', 'candle',
  'bottle', 'hammer', 'barrel', 'satchel', 'pebble',
  'twine', 'mortar', 'flint', 'kettle', 'plank',
]

function rollWord(): { word: string; wordType: WordType } {
  const isThematic = Math.random() < 0.70
  const pool = isThematic ? THEMATIC_WORDS : RANDOM_WORDS
  return {
    word: pool[Math.floor(Math.random() * pool.length)],
    wordType: isThematic ? 'thematic' : 'random',
  }
}

// Fire > Plant > Stone > Water > Fire (circular)
// Light and Necro mutually beat each other
const WEAKNESS_MAP: Partial<Record<Element, Element>> = {
  fire: 'plant',
  plant: 'stone',
  stone: 'water',
  water: 'fire',
  light: 'necro',
  necro: 'light',
}

function checkWeakness(attackElement: Element, bossElement: Element): boolean {
  return WEAKNESS_MAP[attackElement] === bossElement
}

// Cumulative thresholds × 100: [common, rare, epic, legendary, cursed]
// Cursed appears only at shop levels 3–5 with tiny probability
const RARITY_WEIGHTS: Record<number, [number, number, number, number, number]> = {
  1: [60,   90,   99,    100,   100],  // 60C / 30R / 9E  / 1L  / 0%   cursed
  2: [45,   75,   95,    100,   100],  // 45C / 30R / 20E / 5L  / 0%   cursed
  3: [25,   55,   90,    99.5,  100],  // 25C / 30R / 35E / 9.5L / 0.5% cursed
  4: [15,   40,   90,    99,    100],  // 15C / 25R / 50E / 9L  / 1%   cursed
  5: [5,    30,   90,    98,    100],  // 5C  / 25R / 60E / 8L  / 2%   cursed
}

function rollRarity(shopLevel: number): Rarity {
  const [c, r, e, l] = RARITY_WEIGHTS[shopLevel]
  const roll = Math.random() * 100
  if (roll < c) return 'common'
  if (roll < r) return 'rare'
  if (roll < e) return 'epic'
  if (roll < l) return 'legendary'
  return 'cursed'
}

const PURCHASE_PRICE: Record<Rarity, number> = {
  common: 1, rare: 2, epic: 3, legendary: 4, cursed: 0,
}

const ALL_ELEMENTS: Element[] = ['fire', 'water', 'stone', 'plant', 'necro', 'light']

function calcME(level: number): number {
  return Math.pow(1.4, level - 1)
}

function calcMP(level: number): number {
  return Math.pow(1.25, level - 1)
}

function calcPlayerMaxHP(MP: number, bloodPacts: number): number {
  return Math.floor(100 * MP * Math.pow(0.85, bloodPacts))
}

export const HP_PACT_HEAL_AMOUNT = 15

// 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, ... — +1/+2 gold alternating per purchase
export function calcHPPactCost(purchases: number): number {
  return 3 + Math.floor(purchases * 1.5)
}

function calcDerivedStats(level: number, bloodPacts: number) {
  const ME = calcME(level)
  const MP = calcMP(level)
  return {
    ME,
    MP,
    playerMaxHP: calcPlayerMaxHP(MP, bloodPacts),
    bossMaxHP: Math.floor(50 * ME),
  }
}

function baseStatForRarity(rarity: Rarity, ME: number): number {
  const base: Record<Rarity, number> = {
    common: 5, rare: 12, epic: 20, legendary: 35, cursed: 70,
  }
  return Math.floor(base[rarity] * ME)
}

function makeCard(rarity: Rarity, ME: number, overrides: Partial<Card> = {}): Card {
  const { word, wordType } = rollWord()
  return {
    id: crypto.randomUUID(),
    rarity,
    itemType: 'word',
    word,
    wordType,
    baseStat: baseStatForRarity(rarity, ME),
    isScalingDagger: false,
    purchasePrice: PURCHASE_PRICE[rarity],
    anvilUpgradeCount: 0,
    ...overrides,
  }
}

function makeScalingDagger(ME: number): Card {
  return {
    id: 'scaling-dagger',
    rarity: 'legendary',
    itemType: 'word',
    word: 'dagger',
    wordType: 'thematic',
    baseStat: Math.floor(2 * ME), // scales by level only — floor(2 × ME)
    isScalingDagger: true,
    purchasePrice: 4,
    anvilUpgradeCount: 0,
    lore: 'An indestructible blade. Grows as the world grows.',
  }
}

function generateShopCards(shopLevel: number, ME: number): ShopCard[] {
  return ([0, 1, 2] as const).map(i => ({
    ...makeCard(rollRarity(shopLevel), ME),
    shopSlotIndex: i,
  }))
}

function randomElement(): Element {
  return ALL_ELEMENTS[Math.floor(Math.random() * ALL_ELEMENTS.length)]
}

function findFirstNullSlot(hand: (Card | null)[]): number {
  // Start at 1 — slot 0 is permanently reserved for the Scaling Dagger
  for (let i = 1; i < hand.length; i++) {
    if (hand[i] === null) return i
  }
  return -1
}

// ── Initial State ─────────────────────────────────────────────────────────────

function buildInitialState(): GameState {
  const level = 1
  const blood = 0
  const { ME, MP, playerMaxHP, bossMaxHP } = calcDerivedStats(level, blood)
  return {
    currentLevel: level,
    ME,
    MP,
    playerMaxHP,
    bossMaxHP,
    playerHP: playerMaxHP,
    gold: 10,
    bloodPacts: blood,
    timesHealed: 0,
    hpPactPurchases: 0,
    bossHP: bossMaxHP,
    bossElement: randomElement(),
    bossCombatState: 'IDLE',
    hand: [makeScalingDagger(ME), null, null, null, null, null],
    elements: [...ALL_ELEMENTS],
    exhaustedElements: [],
    shopLevel: 1,
    shopCards: generateShopCards(1, ME),
    bloodAltarCard: makeCard('cursed', ME),
    combatPhase: 'IDLE',
    turnCount: 0,
    lootCards: null,
    databank: {},
    isCrafting: false,
    storyLog: [],
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...buildInitialState(),

  // ── Shop & Inventory ──────────────────────────────────────────────────────

  buyCard: (shopSlotIndex) => {
    if (get().isCrafting) return
    const state = get()
    const card = state.shopCards.find(c => c.shopSlotIndex === shopSlotIndex)
    if (!card) return
    if (state.gold < card.purchasePrice) return
    const slot = findFirstNullSlot(state.hand)
    if (slot === -1) return // hand full
    const newHand = [...state.hand] as (Card | null)[]
    newHand[slot] = card
    set({
      gold: state.gold - card.purchasePrice,
      hand: newHand,
      shopCards: state.shopCards.filter(c => c.shopSlotIndex !== shopSlotIndex),
    })
  },

  discardCard: (cardId) => {
    if (get().isCrafting) return
    const state = get()
    const slotIndex = state.hand.findIndex(c => c?.id === cardId)
    if (slotIndex === -1) return
    const card = state.hand[slotIndex]!
    if (card.isScalingDagger) return
    const sellGold = card.rarity === 'common'
      ? 1
      : card.rarity === 'cursed'
        ? 0
        : Math.ceil(card.purchasePrice / 2)
    const newHand = [...state.hand] as (Card | null)[]
    newHand[slotIndex] = null
    set({ hand: newHand, gold: state.gold + sellGold })
  },

  rerollShop: () => {
    if (get().isCrafting) return
    const state = get()
    if (state.gold < 2) return
    set({
      gold: state.gold - 2,
      shopCards: generateShopCards(state.shopLevel, state.ME),
    })
  },

  upgradeShopLevel: () => {
    const state = get()
    if (state.shopLevel >= 5) return
    if (state.gold < 5) return
    set({ gold: state.gold - 5, shopLevel: state.shopLevel + 1 })
  },

  upgradeAnvilCard: (cardId) => {
    if (get().isCrafting) return
    const state = get()
    const slotIndex = state.hand.findIndex(c => c?.id === cardId)
    if (slotIndex === -1) return
    const card = state.hand[slotIndex]!
    if (card.isScalingDagger) return
    const cost = 2 * Math.pow(2, card.anvilUpgradeCount)
    if (state.gold < cost) return
    const newHand = [...state.hand] as (Card | null)[]
    newHand[slotIndex] = {
      ...card,
      baseStat: baseStatForRarity(card.rarity, state.ME),
      anvilUpgradeCount: card.anvilUpgradeCount + 1,
    }
    set({ gold: state.gold - cost, hand: newHand })
  },

  // ── Blood Altar ───────────────────────────────────────────────────────────

  acceptBloodPact: () => {
    if (get().isCrafting) return
    const state = get()
    if (!state.bloodAltarCard) return
    const slot = findFirstNullSlot(state.hand)
    if (slot === -1) return // hand full
    const newPacts = state.bloodPacts + 1
    const newMaxHP = calcPlayerMaxHP(state.MP, newPacts)
    const newHand = [...state.hand] as (Card | null)[]
    newHand[slot] = state.bloodAltarCard
    set({
      hand: newHand,
      bloodPacts: newPacts,
      playerMaxHP: newMaxHP,
      playerHP: Math.min(state.playerHP, newMaxHP),
      bloodAltarCard: null, // stays null until advanceLevel()
      storyLog: [...state.storyLog, makeLogEntry(pickRandom(LOG_BLOOD))],
    })
  },

  // ── Campfire ──────────────────────────────────────────────────────────────

  healAtCampfire: () => {
    const state = get()
    const cost = 2 + state.timesHealed
    if (state.gold < cost) return
    if (state.playerHP >= state.playerMaxHP) return
    const healAmount = Math.floor(state.playerMaxHP * 0.15)
    set({
      gold: state.gold - cost,
      playerHP: Math.min(state.playerMaxHP, state.playerHP + healAmount),
      timesHealed: state.timesHealed + 1,
      storyLog: [...state.storyLog, makeLogEntry(pickRandom(LOG_HEAL))],
    })
  },

  // ── HP Pact ───────────────────────────────────────────────────────────────

  buyHPWithGold: () => {
    const state = get()
    const cost = calcHPPactCost(state.hpPactPurchases)
    if (state.gold < cost) return
    if (state.playerHP >= state.playerMaxHP) return
    set({
      gold: state.gold - cost,
      playerHP: Math.min(state.playerMaxHP, state.playerHP + HP_PACT_HEAL_AMOUNT),
      hpPactPurchases: state.hpPactPurchases + 1,
      storyLog: [...state.storyLog, makeLogEntry(pickRandom(LOG_HEAL))],
    })
  },

  // ── Combat ────────────────────────────────────────────────────────────────

  executeAttack: (cardId) => {
    if (get().isCrafting) return
    const state = get()
    if (state.combatPhase !== 'PLAYER_TURN') return
    const slotIndex = state.hand.findIndex(c => c?.id === cardId)
    if (slotIndex === -1) return
    const card = state.hand[slotIndex]!

    // Attacking resets the crafting window
    const canVaporize =
      card.itemType === 'fused' &&
      card.element !== undefined &&
      checkWeakness(card.element, state.bossElement) &&
      card.baseStat > 20 * state.ME

    const damage = canVaporize ? card.baseStat * 3 : card.baseStat

    let newHand = [...state.hand] as (Card | null)[]
    let newBloodPacts = state.bloodPacts
    let newPlayerMaxHP = state.playerMaxHP

    if (canVaporize && !card.isScalingDagger) {
      newHand[slotIndex] = null // card shatters on vaporize
      newBloodPacts = Math.max(0, state.bloodPacts - 1)
      newPlayerMaxHP = calcPlayerMaxHP(state.MP, newBloodPacts)
    }

    const newBossHP = Math.max(0, state.bossHP - damage)

    const attackLog = canVaporize
      ? pickRandom(LOG_VAPORIZE)
      : `You strike the boss for ${damage} damage.`

    set({
      hand: newHand,
      bloodPacts: newBloodPacts,
      playerMaxHP: newPlayerMaxHP,
      bossHP: newBossHP,
      bossCombatState: 'TAKING_DAMAGE',
      exhaustedElements: [],
      storyLog: [...state.storyLog, makeLogEntry(attackLog)],
    })

    // Reset animation state after 600ms — guard prevents overwriting DEAD
    setTimeout(() => {
      if (get().bossCombatState !== 'DEAD') {
        set({ bossCombatState: 'IDLE' })
      }
    }, 600)

    if (newBossHP <= 0) {
      const goldReward = 3 + state.currentLevel
      const loot2Rarity = Math.random() < 0.20 ? 'cursed' : rollRarity(state.shopLevel)
      set({
        bossCombatState: 'DEAD',
        combatPhase: 'POST_BOSS_LOOT',
        gold: state.gold + goldReward,
        lootCards: [
          makeCard(rollRarity(state.shopLevel), state.ME),
          makeCard(rollRarity(state.shopLevel), state.ME),
          makeCard(loot2Rarity, state.ME),
        ],
      })
      return
    }

    // Enrage check
    const newTurnCount = state.turnCount + 1
    if (newTurnCount >= 10) {
      set({
        bossCombatState: 'ENRAGED',
        playerHP: 0,
        combatPhase: 'GAME_OVER',
        turnCount: newTurnCount,
      })
      return
    }

    // Boss attack cycle
    const bossDamage = Math.floor(state.ME * 10)
    const newPlayerHP = Math.max(0, state.playerHP - bossDamage)
    const counterLog = makeLogEntry(`The boss hits back for ${bossDamage} damage. Ouch.`)
    if (newPlayerHP <= 0) {
      set(s => ({ playerHP: 0, combatPhase: 'GAME_OVER', turnCount: newTurnCount, storyLog: [...s.storyLog, counterLog] }))
    } else {
      set(s => ({ playerHP: newPlayerHP, combatPhase: 'PLAYER_TURN', turnCount: newTurnCount, storyLog: [...s.storyLog, counterLog] }))
    }
  },

  draftLootCard: (index) => {
    if (get().isCrafting) return
    const state = get()
    if (!state.lootCards) return
    if (index < 0 || index >= state.lootCards.length) return
    const slot = findFirstNullSlot(state.hand)
    if (slot === -1) return // hand full
    const card = state.lootCards[index]
    const newHand = [...state.hand] as (Card | null)[]
    newHand[slot] = card

    if (card.rarity === 'cursed') {
      const newPacts = state.bloodPacts + 1
      const newMaxHP = calcPlayerMaxHP(state.MP, newPacts)
      set({
        hand: newHand,
        lootCards: null,
        bloodPacts: newPacts,
        playerMaxHP: newMaxHP,
        playerHP: Math.min(state.playerHP, newMaxHP),
        storyLog: [...state.storyLog, makeLogEntry(pickRandom(LOG_BLOOD))],
      })
    } else {
      set({ hand: newHand, lootCards: null })
    }
  },

  // ── Crafting ──────────────────────────────────────────────────────────────

  craftCards: async (element, wordCardId) => {
    const state = get()
    if (state.isCrafting) return
    const slotIndex = state.hand.findIndex(c => c?.id === wordCardId)
    if (slotIndex === -1) return
    const wordCard = state.hand[slotIndex]!
    if (wordCard.isScalingDagger) return
    if (wordCard.itemType !== 'word') return
    if (state.exhaustedElements.includes(element)) return

    const craftKey = `${wordCard.word}+${element}`

    // Lock BEFORE await — prevents any other action from touching the hand
    set({ isCrafting: true })

    const entry = await get().generateCardLore(craftKey)

    // Re-read state after await; verify card is still in the same slot
    const postAwaitState = get()
    const verifySlot = postAwaitState.hand.findIndex(c => c?.id === wordCardId)
    if (verifySlot === -1) {
      // Defensive fallback — should never happen with isCrafting lock in place
      set({ isCrafting: false })
      return
    }

    const sourceCard = postAwaitState.hand[verifySlot]!
    const fusedCard: Card = {
      ...sourceCard,
      id: crypto.randomUUID(),
      itemType: 'fused',
      element,
      craftKey,
      lore: entry.lore,
      synergyMultiplier: entry.synergyMultiplier,
      baseStat: Math.floor(sourceCard.baseStat * entry.synergyMultiplier),
    }

    set(s => {
      const newHand = [...s.hand] as (Card | null)[]
      newHand[verifySlot] = fusedCard
      return {
        hand: newHand,
        exhaustedElements: [...s.exhaustedElements, element],
        isCrafting: false,
        storyLog: [...s.storyLog, makeLogEntry(pickRandom(LOG_CRAFT))],
      }
    })
  },

  // ── LLM / Cache ───────────────────────────────────────────────────────────

  generateCardLore: async (craftKey) => {
    const cached = get().databank[craftKey]
    if (cached) return cached // instant cache hit

    // Mock 2-second LLM delay
    await new Promise<void>(resolve => setTimeout(resolve, 2000))

    const entry: DatabankEntry = {
      name: `${craftKey} Chimera`,
      lore: `Born from ${craftKey}, this chimera defies all classification.`,
      synergyMultiplier: 1 + Math.random() * 0.5, // 1.0–1.5
    }

    set(s => ({ databank: { ...s.databank, [craftKey]: entry } }))
    return entry
  },

  checkHoverCache: (craftKey) => {
    return get().databank[craftKey] ?? null
  },

  // ── Progression ───────────────────────────────────────────────────────────

  advanceLevel: () => {
    set(s => {
      const healthPercentage = s.playerHP / s.playerMaxHP
      const newLevel = s.currentLevel + 1
      const { ME, MP, playerMaxHP, bossMaxHP } = calcDerivedStats(newLevel, s.bloodPacts)

      // Carry HP percentage into the new level so wounds persist
      const newPlayerHP = Math.max(1, Math.floor(playerMaxHP * healthPercentage))

      // Update dagger baseStat for new ME — floor(2 × ME)
      const newHand = [...s.hand] as (Card | null)[]
      if (newHand[0]) {
        newHand[0] = { ...newHand[0], baseStat: Math.floor(2 * ME) }
      }

      return {
        currentLevel: newLevel,
        ME,
        MP,
        playerMaxHP,
        bossMaxHP,
        playerHP: newPlayerHP,
        bossHP: bossMaxHP,
        bossElement: randomElement(),
        turnCount: 0,
        exhaustedElements: [],
        bossCombatState: 'IDLE',
        combatPhase: 'PLAYER_TURN',
        lootCards: null,
        hand: newHand,
        shopCards: generateShopCards(s.shopLevel, ME),
        bloodAltarCard: makeCard('cursed', ME), // altar refreshes only here
        storyLog: [...s.storyLog, makeLogEntry(pickRandom(LOG_LEVEL))],
      }
    })
  },

  restartGame: () => set(buildInitialState()),

  addLog: (message) => {
    set(s => ({ storyLog: [...s.storyLog, makeLogEntry(message)] }))
  },
}))
