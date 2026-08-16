'use server'

// Pure TypeScript fuzzy answer matching (no python/external deps, works in serverless).
// Ignores symbols/capitalization, treats ; and , as word separators, splits the
// correct answer into accepted variants on ; / newline, and matches each variant.

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[;,]+\s*/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(dp[j], dp[j - 1], prev)
      prev = temp
    }
  }
  return dp[b.length]
}

function fuzzRatio(a: string, b: string): number {
  const la = a.length
  const lb = b.length
  if (la === 0 && lb === 0) return 100
  if (la === 0 || lb === 0) return 0
  const dist = levenshtein(a, b)
  return (100 * (la + lb - dist)) / (la + lb)
}

function tokenSetRatio(a: string, b: string): number {
  const ta = [...new Set(a.split(' '))].sort()
  const tb = [...new Set(b.split(' '))].sort()
  if (ta.length === 0 && tb.length === 0) return 100
  if (ta.length === 0 || tb.length === 0) return 0
  // A subset of the words (in any order) counts as correct, so partial answers pass
  if (ta.every((t) => tb.includes(t))) return 100
  if (tb.every((t) => ta.includes(t))) return 100
  return fuzzRatio(ta.join(' '), tb.join(' '))
}

export async function evaluateAnswer(userAnswer: string, correctAnswer: string) {
  try {
    const ua = normalize(userAnswer)
    const variants = correctAnswer.split(/[;\n]/).map(normalize).filter(Boolean)
    if (!variants.length) return { ratio: 0 }

    let best = 0
    for (const v of variants) {
      best = Math.max(best, fuzzRatio(ua, v), tokenSetRatio(ua, v))
    }
    return { ratio: best }
  } catch {
    return { ratio: 0 }
  }
}
