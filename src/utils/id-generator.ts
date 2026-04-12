import { adjectives } from '../assets/adjectives'
import { nouns } from '../assets/nouns'

export const generateSessionId = (): string => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adjective}-${noun}`
}

export const generateUserId = (existingUserIds: string[], maxRetries = 5): string => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const id = `${adjective}-${noun}`

    if (!existingUserIds.includes(id)) {
      return id
    }
  }

  throw new Error('Failed to generate a unique user ID after maximum retries')
}
