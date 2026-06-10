import { useMemo, useState } from 'react'
import { type InventoryItem, submitSentence } from './api'

type SyntaxColumnId = 'subject' | 'verb' | 'object'

type WordOption = {
  id: string
  label: string
  wordType: SyntaxColumnId
}

type SyntaxColumn = {
  id: SyntaxColumnId
  options: WordOption[]
}

type SelectedSyntax = Record<SyntaxColumnId, WordOption | null>

type ShopItem = {
  id: string
  name: string
  cost: number
  description: string
}

const syntaxColumnsSeed: SyntaxColumn[] = [
  {
    id: 'subject',
    options: [
      { id: 'sub-i', label: 'I', wordType: 'subject' },
      { id: 'sub-hesi', label: 'He/She/It', wordType: 'subject' },
      { id: 'sub-we', label: 'We', wordType: 'subject' },
    ],
  },
  {
    id: 'verb',
    options: [
      { id: 'verb-slay', label: 'slay', wordType: 'verb' },
      { id: 'verb-attack', label: 'attack', wordType: 'verb' },
      { id: 'verb-transform', label: 'transform', wordType: 'verb' },
    ],
  },
  {
    id: 'object',
    options: [
      { id: 'obj-all-day', label: 'all day', wordType: 'object' },
      { id: 'obj-neck', label: '(the) neck', wordType: 'object' },
      { id: 'obj-blue', label: 'blue', wordType: 'object' },
    ],
  },
]

const tenseOptions = [
  { id: 'present', label: 'present' },
  { id: 'past', label: 'past' },
  { id: 'future', label: 'future' },
]

const shopItemsSeed: ShopItem[] = [
  { id: 'shop-1', name: 'Starter Sigil', cost: 10, description: 'A basic token for low-tier crafting.' },
  { id: 'shop-2', name: 'Tense Prism', cost: 20, description: 'Stabilizes verb forms in advanced fusions.' },
  { id: 'shop-3', name: 'Echo Core', cost: 50, description: 'Rare component used for high-rarity words.' },
]

const defaultSelectedSyntax: SelectedSyntax = {
  subject: null,
  verb: null,
  object: null,
}

function App() {
  const [level, setLevel] = useState(1)
  const [stage] = useState(1)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedSyntax, setSelectedSyntax] = useState<SelectedSyntax>(defaultSelectedSyntax)
  const [isLoading, setIsLoading] = useState(false)
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [isCongratsOpen, setIsCongratsOpen] = useState(false)
  const [isHudExpanded, setIsHudExpanded] = useState(false)
  const [isVerbPopupOpen, setIsVerbPopupOpen] = useState(false)
  const [selectedTense, setSelectedTense] = useState('present')
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>([])
  const [activeShopPreview, setActiveShopPreview] = useState<ShopItem | null>(null)
  const [isCraftPreviewOpen, setIsCraftPreviewOpen] = useState(false)
  const [storyLog, setStoryLog] = useState<string[]>([
    'A sentence gate appears.',
    'Choose one word from each syntax column.',
  ])
  const [rewardBuffer, setRewardBuffer] = useState<InventoryItem[]>([])
  const [syntaxColumns] = useState<SyntaxColumn[]>(syntaxColumnsSeed)
  const [shopItems] = useState<ShopItem[]>(shopItemsSeed)

  const canSubmit = Boolean(selectedSyntax.subject && selectedSyntax.verb && selectedSyntax.object)
  const canCraft = selectedInventoryIds.length === 2

  const selectedSentence = useMemo(
    () =>
      `${selectedSyntax.subject?.label ?? ''} ${selectedSyntax.verb?.label ?? ''} ${selectedSyntax.object?.label ?? ''}`.trim(),
    [selectedSyntax],
  )

  const toggleInventorySelection = (itemId: string) => {
    setSelectedInventoryIds((current) => {
      if (current.includes(itemId)) return current.filter((id) => id !== itemId)
      if (current.length === 2) return [current[1], itemId]
      return [...current, itemId]
    })
  }

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return

    setIsLoading(true)
    setStoryLog((current) => [...current, 'thinking...'])
    try {
      const response = await submitSentence(`${selectedSentence} (${selectedTense})`)
      setStoryLog((current) => {
        const filtered = current.filter((line) => line !== 'thinking...')
        return [...filtered, response.story]
      })
      setRewardBuffer(response.rewards)
      setIsCongratsOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const goToNextLevel = () => {
    setInventory((current) => [...current, ...rewardBuffer])
    setLevel((current) => current + 1)
    setSelectedSyntax({ subject: null, verb: null, object: null })
    setSelectedInventoryIds([])
    setIsCongratsOpen(false)
    setRewardBuffer([])
  }

  return (
    <main
      className={`relative min-h-screen bg-paper px-3 py-4 font-monoSketch text-ink sm:px-6 lg:px-8 ${
        isLoading ? 'pointer-events-none' : ''
      }`}
    >
      <section className="mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col justify-between rounded-2xl border-2 border-panelSoft bg-panel p-4 shadow-2xl sm:p-6">
        <header className="flex items-start justify-between">
          <div className="font-sketch text-3xl sm:text-4xl">
            <p>Level {level}</p>
            <p className="text-xl sm:text-2xl">Stage {stage}</p>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setIsShopOpen(true)}
            className="rounded-md border-2 border-ink px-3 py-1 text-xl transition hover:bg-panelSoft disabled:cursor-not-allowed disabled:opacity-40"
          >
            ☆
          </button>
        </header>

        <section className="mt-6 flex flex-1 flex-col gap-4">
          <div className="hidden flex-1 rounded-2xl border-2 border-dashed border-panelSoft/70 bg-[#11141b] lg:block" />

          <div className="grid gap-4 md:grid-cols-[260px_1fr] md:items-end">
            <aside className="relative flex h-56 flex-col rounded-xl border-2 border-panelSoft bg-[#11141b] p-3 md:h-64">
              <p className="font-sketch text-3xl">story log</p>
              <div className="mt-2 flex-1 overflow-y-auto rounded border border-panelSoft bg-black/20 p-2 pr-2 text-sm sm:text-base">
                {storyLog.map((line, index) => (
                  <p key={`${line}-${index}`} className="mb-1 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
              <p className="mt-3 max-w-[82%] truncate rounded border border-panelSoft bg-panelSoft/70 px-2 py-1">
                {selectedSentence || '...'}
              </p>
              <span className="absolute bottom-4 right-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent bg-black/80 text-accent animate-pulse-sketch">
                !
              </span>
            </aside>

            <div className="overflow-x-auto pb-1">
              <div className="relative min-w-[680px] rounded-xl border-2 border-panelSoft bg-[#11141b] p-4">
                <div className="mb-3 grid grid-cols-3">
                  <div />
                  <div className="flex justify-center">
                    {canSubmit && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={handleSubmit}
                        className="animate-pulse-sketch rounded border-2 border-accent bg-accent/20 px-4 py-2 text-accent disabled:opacity-40"
                      >
                        {isLoading ? 'Submitting...' : 'Submit'}
                      </button>
                    )}
                  </div>
                  <div />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {syntaxColumns.map((column) => (
                    <div key={column.id} className="flex min-h-52 flex-col gap-2">
                      {column.options.map((option, index) => {
                        const visible = index === 0 || isHudExpanded
                        if (!visible) return null
                        const selectedOption = selectedSyntax[column.id]
                        const isSelected = selectedOption?.id === option.id
                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={isLoading}
                            onClick={() => {
                              setSelectedSyntax((current) => ({ ...current, [column.id]: option }))
                              if (column.id === 'verb') setIsVerbPopupOpen(true)
                            }}
                            className={`rounded border-2 px-2 py-2 text-left transition ${
                              isSelected
                                ? 'border-accent bg-accent/20'
                                : 'border-panelSoft bg-panel hover:bg-panelSoft'
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                      {column.id === 'verb' && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => setIsHudExpanded((current) => !current)}
                          className="mt-1 text-left text-sm text-accent disabled:opacity-50"
                        >
                          {isHudExpanded ? 'hide options' : '▼ show all columns'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isVerbPopupOpen && (
                  <div className="absolute right-8 top-10 w-32 rounded border-2 border-panelSoft bg-[#1e212a] p-2">
                    <button
                      type="button"
                      className="ml-auto block text-xs text-ink/80 hover:text-ink"
                      onClick={() => setIsVerbPopupOpen(false)}
                    >
                      X
                    </button>
                    <div className="mt-1 space-y-1">
                      {tenseOptions.map((tense) => (
                        <button
                          key={tense.id}
                          type="button"
                          disabled={isLoading}
                          onClick={() => setSelectedTense(tense.label)}
                          className={`w-full rounded border px-2 py-1 text-left text-sm ${
                            selectedTense === tense.label
                              ? 'border-accent bg-accent/20'
                              : 'border-panelSoft bg-panel'
                          }`}
                        >
                          {tense.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </section>

      {isShopOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-2 sm:p-4 md:p-6">
          <div className="relative mx-auto h-full w-full rounded-xl border-2 border-panelSoft bg-panel p-4 shadow-2xl md:h-[calc(100vh-3rem)] md:w-[calc(100%-3rem)] lg:w-[calc(100%-6rem)] lg:p-6">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setIsShopOpen(false)
                setSelectedInventoryIds([])
                setIsCraftPreviewOpen(false)
              }}
              className="absolute right-3 top-3 rounded border border-panelSoft px-2 py-1"
            >
              X
            </button>

            <h2 className="font-sketch text-4xl">SHOP</h2>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {shopItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={isLoading}
                  onMouseEnter={() => setActiveShopPreview(item)}
                  onClick={() => setActiveShopPreview(item)}
                  className="h-24 rounded border-2 border-panelSoft bg-[#11141b] p-2 text-left hover:border-accent disabled:opacity-40"
                >
                  <div className="h-full rounded border border-dashed border-panelSoft" />
                  <p className="pt-1 text-center">{item.cost}</p>
                </button>
              ))}
            </div>

            {activeShopPreview && (
              <div className="mt-3 w-fit rounded border border-panelSoft bg-[#11141b] px-3 py-2 text-sm">
                {activeShopPreview.name}: {activeShopPreview.description}
              </div>
            )}

            <div className="relative mt-6 h-[65%] rounded-xl border-2 border-panelSoft bg-[#11141b] p-3">
              <p className="font-sketch text-3xl">Inventory</p>
              <div className="mt-3 grid max-h-[86%] grid-cols-2 gap-3 overflow-y-auto pr-3 sm:grid-cols-3">
                {inventory.length === 0 && (
                  <p className="col-span-full text-sm text-ink/70">
                    Empty inventory. Complete a level to collect reward items.
                  </p>
                )}
                {inventory.map((item) => {
                  const isSelected = selectedInventoryIds.includes(item.id)
                  const isSecondSelected = selectedInventoryIds[1] === item.id
                  return (
                    <div key={item.id} className="relative">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => toggleInventorySelection(item.id)}
                        className={`h-24 w-full rounded border-2 p-2 text-left text-xs transition ${
                          isSelected
                            ? 'border-accent ring-2 ring-orange-300'
                            : 'border-panelSoft bg-panel hover:bg-panelSoft'
                        } disabled:opacity-40`}
                      >
                        <p className="truncate font-bold">{item.name}</p>
                        <p>{item.wordType}</p>
                        <p>{item.cost}g</p>
                      </button>

                      {canCraft && isSecondSelected && (
                        <div className="absolute -right-[86px] top-2 z-50 w-20 rounded border-2 border-panelSoft bg-[#1e212a] p-1">
                          <button
                            type="button"
                            className="mb-1 block w-full rounded border border-panelSoft px-1 py-1 text-left text-xs hover:border-accent"
                            onMouseEnter={() => setIsCraftPreviewOpen(true)}
                            onMouseLeave={() => setIsCraftPreviewOpen(false)}
                          >
                            Craft
                          </button>
                          <button
                            type="button"
                            className="mb-1 block w-full rounded border border-panelSoft px-1 py-1 text-left text-xs"
                          >
                            Sell
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded border border-panelSoft px-1 py-1 text-left text-xs"
                            onClick={() => setSelectedInventoryIds([])}
                          >
                            X
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="pointer-events-none absolute right-2 top-16 h-[75%] w-1 rounded bg-panelSoft/70" />
              {isCraftPreviewOpen && (
                <div className="absolute bottom-8 right-8 rounded border-2 border-panelSoft bg-black px-3 py-2 text-xs">
                  Craft preview: combines both selected items into one higher tier token.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isCongratsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-3">
          <div className="relative w-full max-w-2xl rounded-2xl border-2 border-panelSoft bg-panel p-5 sm:p-8">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setIsCongratsOpen(false)}
              className="absolute right-4 top-4 rounded border border-panelSoft px-2 py-1"
            >
              X
            </button>

            <h3 className="text-center font-sketch text-4xl">Congrats to Level {level + 1}!</h3>
            <p className="mt-4 text-center text-sm sm:text-base">Your syntax chain rewrote the encounter.</p>

            <p className="mt-5 text-center font-sketch text-3xl">Reward</p>
            <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-3">
              {rewardBuffer.map((reward) => (
                <div
                  key={reward.id}
                  className="rounded border-2 border-panelSoft bg-[#11141b] p-3 transition hover:shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                >
                  <p className="truncate font-bold">{reward.name}</p>
                  <p className="text-sm">{reward.wordType}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={goToNextLevel}
              className="mx-auto mt-6 block rounded border-2 border-accent bg-accent/20 px-4 py-2 text-accent"
            >
              Next Level
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-[70] cursor-wait bg-black/40" aria-hidden="true" />
      )}
    </main>
  )
}

export default App
