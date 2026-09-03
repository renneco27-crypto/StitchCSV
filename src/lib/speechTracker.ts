export interface WordAlignment {
  targetWord: string
  cleanTarget: string
  spokenWord?: string
  status: 'pending' | 'active' | 'correct' | 'wrong' | 'omitted'
  index: number
}

export interface SpeechTrackingResult {
  words: WordAlignment[]
  correctCount: number
  wrongCount: number
  omittedCount: number
  totalTargetWords: number
  isComplete: boolean
  currentProgressPercent: number
}

function cleanWord(w: string): string {
  return w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '').trim()
}

/** Levenshtein similarity ratio between 0.0 and 1.0 */
export function wordSimilarity(s1: string, s2: string): number {
  const a = cleanWord(s1)
  const b = cleanWord(s2)
  if (!a && !b) return 1.0
  if (!a || !b) return 0.0
  if (a === b) return 1.0

  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      )
    }
  }

  const distance = dp[m][n]
  const maxLen = Math.max(m, n)
  return 1 - distance / maxLen
}

function isWordMatch(target: string, spoken: string): boolean {
  const ct = cleanWord(target)
  const cs = cleanWord(spoken)
  if (ct === cs) return true
  // Fuzzy threshold: for words >= 4 letters, allow 0.75 similarity
  if (ct.length >= 4 && cs.length >= 3) {
    return wordSimilarity(ct, cs) >= 0.75
  }
  return false
}

/**
 * Align spoken words in real-time against target reference text.
 * Uses a sliding 3-word anchor window so that if words are omitted,
 * inserted, or substituted, subsequent correct words synchronize.
 */
export function alignSpokenWords(targetText: string, spokenText: string): SpeechTrackingResult {
  const rawTargetTokens = targetText.trim().split(/\s+/).filter(Boolean)
  const rawSpokenTokens = spokenText.trim().split(/\s+/).filter(Boolean)

  if (rawTargetTokens.length === 0) {
    return {
      words: [],
      correctCount: 0,
      wrongCount: 0,
      omittedCount: 0,
      totalTargetWords: 0,
      isComplete: false,
      currentProgressPercent: 0,
    }
  }

  const results: WordAlignment[] = rawTargetTokens.map((w, idx) => ({
    targetWord: w,
    cleanTarget: cleanWord(w),
    status: 'pending',
    index: idx,
  }))

  let tIdx = 0
  let sIdx = 0
  const T = rawTargetTokens.length
  const S = rawSpokenTokens.length

  while (tIdx < T && sIdx < S) {
    const targetWord = rawTargetTokens[tIdx]
    const spokenWord = rawSpokenTokens[sIdx]

    // 1. Direct match
    if (isWordMatch(targetWord, spokenWord)) {
      results[tIdx].status = 'correct'
      results[tIdx].spokenWord = spokenWord
      tIdx++
      sIdx++
      continue
    }

    // 2. Anchor Window Search (lookahead up to 3 words in target or spoken)
    let foundAnchor = false

    // Look ahead in target (User skipped/omitted some target words)
    for (let targetLookahead = 1; targetLookahead <= 3 && tIdx + targetLookahead < T; targetLookahead++) {
      if (isWordMatch(rawTargetTokens[tIdx + targetLookahead], spokenWord)) {
        // User omitted words from tIdx to tIdx + targetLookahead - 1
        for (let k = 0; k < targetLookahead; k++) {
          results[tIdx + k].status = 'omitted'
        }
        tIdx += targetLookahead
        results[tIdx].status = 'correct'
        results[tIdx].spokenWord = spokenWord
        tIdx++
        sIdx++
        foundAnchor = true
        break
      }
    }

    if (foundAnchor) continue

    // Look ahead in spoken (User inserted extra filler/hallucinated words)
    for (let spokenLookahead = 1; spokenLookahead <= 3 && sIdx + spokenLookahead < S; spokenLookahead++) {
      if (isWordMatch(targetWord, rawSpokenTokens[sIdx + spokenLookahead])) {
        // Extra spoken words were inserted; attach and skip to match
        sIdx += spokenLookahead
        results[tIdx].status = 'correct'
        results[tIdx].spokenWord = rawSpokenTokens[sIdx]
        tIdx++
        sIdx++
        foundAnchor = true
        break
      }
    }

    if (foundAnchor) continue

    // 3. Substitution mismatch (e.g. said "Justine", expected "Mary")
    results[tIdx].status = 'wrong'
    results[tIdx].spokenWord = spokenWord
    tIdx++
    sIdx++
  }

  // If there are still words in target after spoken ended
  if (tIdx < T && sIdx >= S && results.some(r => r.status !== 'pending')) {
    // Mark the next word as active
    results[tIdx].status = 'active'
  }

  const correctCount = results.filter(w => w.status === 'correct').length
  const wrongCount = results.filter(w => w.status === 'wrong').length
  const omittedCount = results.filter(w => w.status === 'omitted').length
  const isComplete = tIdx >= T || (correctCount + wrongCount + omittedCount === T)
  const currentProgressPercent = Math.round((tIdx / T) * 100)

  return {
    words: results,
    correctCount,
    wrongCount,
    omittedCount,
    totalTargetWords: T,
    isComplete,
    currentProgressPercent: Math.min(100, Math.max(0, currentProgressPercent)),
  }
}
