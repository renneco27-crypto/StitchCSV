'use server'

import { exec } from 'child_process'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function evaluateAnswer(userAnswer: string, correctAnswer: string) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'fuzzy_match.py')
    
    // Pass arguments safely (in a real app, escaping might be needed or better use stdin)
    // For simplicity, we wrap in quotes
    const cmd = `python "${scriptPath}" "${userAnswer.replace(/"/g, '\\"')}" "${correctAnswer.replace(/"/g, '\\"')}"`
    
    const { stdout } = await execAsync(cmd)
    const result = JSON.parse(stdout.trim())
    
    if (result.error) {
      console.error('Python error:', result.error)
      return { ratio: 0 }
    }
    
    return { ratio: result.ratio }
  } catch (error) {
    console.error('Failed to evaluate answer:', error)
    return { ratio: 0 }
  }
}
