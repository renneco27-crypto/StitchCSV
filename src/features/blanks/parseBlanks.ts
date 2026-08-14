export interface TextToken {
  id: string
  text: string
  isWord: boolean
  isBlank: boolean
}

export function parseBlanks(text: string, blankPercentage: number = 0.15): TextToken[] {
  // Regex to split by words but keep whitespace and punctuation as separate tokens
  const tokens = text.split(/([a-zA-Z0-9_]+)/g).filter(Boolean)
  
  const result: TextToken[] = []
  
  // First, identify all valid word tokens
  const wordTokens = tokens.map((text, i) => {
    const isWord = /^[a-zA-Z0-9_]+$/.test(text)
    return { text, isWord, originalIndex: i }
  }).filter(t => t.isWord)
  
  // Randomly select indices to become blanks
  const numBlanks = Math.max(1, Math.floor(wordTokens.length * blankPercentage))
  const shuffled = [...wordTokens].sort(() => 0.5 - Math.random())
  const selectedBlankIndices = new Set(shuffled.slice(0, numBlanks).map(t => t.originalIndex))
  
  // Build final array
  tokens.forEach((text, i) => {
    const isWord = /^[a-zA-Z0-9_]+$/.test(text)
    result.push({
      id: `token-${i}`,
      text,
      isWord,
      isBlank: isWord && selectedBlankIndices.has(i)
    })
  })
  
  return result
}
