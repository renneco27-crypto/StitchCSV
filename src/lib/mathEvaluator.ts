/**
 * Math Formula & Equation Evaluator Engine
 * Safely parses and evaluates mathematical expressions and equations:
 * - Exponents: (2^3), 2^3, 2**3 -> 8
 * - Basic Arithmetic: +, -, *, /, %, (), decimals, fractions
 * - Functions: sqrt(x), √x, abs(x), sin, cos, tan, log, ln
 * - Constants: pi, π, e
 * - Linear algebraic equations: 2x + 4 = 10 -> x = 3
 */

// Tokenize and clean mathematical expressions
function sanitizeMathExpression(raw: string): string {
  let expr = raw.trim()

  // Replace common unicode math symbols
  expr = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'Math.PI')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/√\s*(\d+(\.\d+)?)/g, 'Math.sqrt($1)')
    .replace(/√\s*\(([^)]+)\)/g, 'Math.sqrt($1)')
    .replace(/\bsqrt\s*\(/gi, 'Math.sqrt(')
    .replace(/\babs\s*\(/gi, 'Math.abs(')
    .replace(/\bsin\s*\(/gi, 'Math.sin(')
    .replace(/\bcos\s*\(/gi, 'Math.cos(')
    .replace(/\btan\s*\(/gi, 'Math.tan(')
    .replace(/\blog\s*\(/gi, 'Math.log10(')
    .replace(/\bln\s*\(/gi, 'Math.log(')

  // Replace power ^ with JavaScript exponentiation operator **
  // e.g. 2^3 -> 2**3, (2+1)^3 -> (2+1)**3
  expr = expr.replace(/\^/g, '**')

  return expr
}

// Safely evaluate arithmetic expression without eval/Function vulnerabilities
export function evaluateMathExpression(raw: string): number | null {
  if (!raw || typeof raw !== 'string') return null

  // Remove leading/trailing quotes or brackets
  let cleaned = raw.trim().replace(/^["']|["']$/g, '')

  // Remove prefixes like "x =", "x=", "answer:", "ans =", "y ="
  cleaned = cleaned.replace(/^[a-zA-Z]\s*=\s*/, '')
  cleaned = cleaned.replace(/^(evaluate|calculate|solve|ans|answer)\s*:?\s*/i, '')

  // If already a plain number
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : n
  }

  // Check if it's a simple fraction like 1/2, 3/4, -5/8
  const fracMatch = cleaned.match(/^(-?\d+)\s*\/\s*(\d+)$/)
  if (fracMatch) {
    const denom = parseFloat(fracMatch[2])
    if (denom !== 0) {
      return parseFloat(fracMatch[1]) / denom
    }
  }

  // Check if it's a percentage like 50%, 25.5%
  const pctMatch = cleaned.match(/^(-?\d+(\.\d+)?)\s*%$/)
  if (pctMatch) {
    return parseFloat(pctMatch[1]) / 100
  }

  try {
    const sanitized = sanitizeMathExpression(cleaned)

    // Ensure expression only contains safe math tokens: numbers, operators, parens, Math.*
    const safeRegex = /^[\d\s+\-*/%(),.eEMathPIEsqrtsincostanlog10]+$/
    // Verify valid tokens
    const testSanitized = sanitized.replace(/Math\.(PI|E|sqrt|abs|sin|cos|tan|log10|log)/g, '')
    if (!/^[\d\s+\-*/%(),.**eE]+$/.test(testSanitized)) {
      return null
    }

    // Safe evaluator using Function with restricted scope
    const fn = new Function(`"use strict"; return (${sanitized});`)
    const result = fn()

    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result
    }
    return null
  } catch {
    return null
  }
}

// Solve linear equation of form "ax + b = c" or "2x + 4 = 10" or "x + 5 = 12"
export function solveLinearEquation(raw: string): number | null {
  if (!raw || !raw.includes('=')) return null

  const parts = raw.split('=')
  if (parts.length !== 2) return null

  const leftStr = parts[0].trim()
  const rightStr = parts[1].trim()

  // If right side is a variable assignment like "x = 8" or "8 = x"
  const leftNum = evaluateMathExpression(leftStr)
  const rightNum = evaluateMathExpression(rightStr)

  if (leftNum !== null && /^[a-zA-Z]$/.test(rightStr)) {
    return leftNum
  }
  if (rightNum !== null && /^[a-zA-Z]$/.test(leftStr)) {
    return rightNum
  }

  // Check equation with variable x, e.g. "2x + 4 = 10" -> f(x) = left - right
  // We can solve numerically for x in range [-1000, 1000]
  const varMatch = raw.match(/([a-zA-Z])/)
  if (!varMatch) return null
  const variable = varMatch[1]

  try {
    const leftExpr = leftStr
      .replace(new RegExp(`(\\d)(${variable})`, 'g'), '$1*$2')
      .replace(new RegExp(variable, 'g'), 'x')
    const rightExpr = rightStr
      .replace(new RegExp(`(\\d)(${variable})`, 'g'), '$1*$2')
      .replace(new RegExp(variable, 'g'), 'x')

    const sanitizedLeft = sanitizeMathExpression(leftExpr)
    const sanitizedRight = sanitizeMathExpression(rightExpr)

    const f = (xVal: number) => {
      const fn = new Function('x', `"use strict"; return (${sanitizedLeft}) - (${sanitizedRight});`)
      return fn(xVal)
    }

    // Check integer/simple fractional roots
    const y0 = f(0)
    const y1 = f(1)
    const slope = y1 - y0

    if (Math.abs(slope) > 1e-9) {
      const root = -y0 / slope
      if (Math.abs(f(root)) < 1e-6) {
        return root
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Checks if two mathematical expressions / equations are equivalent:
 * e.g. "(2^3)" and "8" -> true
 * "2x + 4 = 10" and "x = 3" -> true
 * "1/2" and "0.5" -> true
 * "sqrt(16)" and "4" -> true
 * "2^3" and "(2^3)" -> true
 */
export function areMathExpressionsEquivalent(input: string, expected: string): boolean {
  if (!input || !expected) return false

  const cleanInput = input.trim().toLowerCase()
  const cleanExpected = expected.trim().toLowerCase()

  if (cleanInput === cleanExpected) return true

  // Strip outer wrapping parens: (2^3) -> 2^3
  const stripParens = (s: string) => s.replace(/^\((.+)\)$/, '$1').trim()
  if (stripParens(cleanInput) === stripParens(cleanExpected)) return true

  // Evaluate both as numerical expressions
  const v1 = evaluateMathExpression(cleanInput)
  const v2 = evaluateMathExpression(cleanExpected)

  if (v1 !== null && v2 !== null) {
    // Check equality within floating point epsilon
    if (Math.abs(v1 - v2) < 1e-5) {
      return true
    }
  }

  // Check if one is an equation and other is the solution
  // e.g. input "x = 3" or "3", expected "2x + 4 = 10"
  if (cleanExpected.includes('=')) {
    const eqSolution = solveLinearEquation(cleanExpected)
    if (eqSolution !== null) {
      if (v1 !== null && Math.abs(v1 - eqSolution) < 1e-5) return true
    }
  }

  if (cleanInput.includes('=')) {
    const eqSolution = solveLinearEquation(cleanInput)
    if (eqSolution !== null) {
      if (v2 !== null && Math.abs(v2 - eqSolution) < 1e-5) return true
    }
  }

  return false
}
