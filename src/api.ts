export type InventoryItem = {
  id: string
  name: string
  wordType: string
  cost: number
  description: string
}

export type SubmitSentenceResponse = {
  story: string
  rewards: InventoryItem[]
}

export async function submitSentence(sentence: string): Promise<SubmitSentenceResponse> {
  await new Promise((resolve) => setTimeout(resolve, 3000))

  return {
    story: `You whisper "${sentence}" and the world bends one level ahead.`,
    rewards: [
      {
        id: crypto.randomUUID(),
        name: 'Verb Shard',
        wordType: 'verb',
        cost: 25,
        description: 'A fractured tense stone from a defeated syntax beast.',
      },
      {
        id: crypto.randomUUID(),
        name: 'Adverb Bloom',
        wordType: 'adverb',
        cost: 20,
        description: 'A glowing bloom that amplifies sentence rhythm.',
      },
    ],
  }
}
