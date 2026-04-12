import { adjectives } from '@assets/adjectives'
import { nouns } from '@assets/nouns'
import { generateUserId } from '@utils/id-generator'

describe('id-generator', () => {
  const mockRandom = jest.fn()

  beforeAll(() => {
    jest.spyOn(Math, 'random').mockImplementation(mockRandom)
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  beforeEach(() => {
    mockRandom.mockReturnValue(0.5)
  })

  describe('generateUserId', () => {
    it('should return an adjective-noun formatted ID', () => {
      const id = generateUserId([])
      const [adj, noun] = id.split('-')
      expect(adjectives).toContain(adj)
      expect(nouns).toContain(noun)
    })

    it('should return an ID not in the existing list', () => {
      const id = generateUserId(['fuzzy-penguin', 'bold-castle'])
      expect(id).not.toBe('fuzzy-penguin')
      expect(id).not.toBe('bold-castle')
    })

    it('should retry on collision and return a unique ID', () => {
      mockRandom
        .mockReturnValueOnce(0) // adjective index 0
        .mockReturnValueOnce(0) // noun index 0
        .mockReturnValueOnce(1 / adjectives.length) // adjective index 1
        .mockReturnValueOnce(1 / nouns.length) // noun index 1

      const collidingId = `${adjectives[0]}-${nouns[0]}`
      const id = generateUserId([collidingId])

      expect(id).not.toBe(collidingId)
      expect(id.split('-')).toHaveLength(2)
    })

    it('should throw after maxRetries exhausted', () => {
      mockRandom.mockReturnValue(0)

      const collidingId = `${adjectives[0]}-${nouns[0]}`
      expect(() => generateUserId([collidingId], 3)).toThrow('Failed to generate a unique user ID')
    })

    it('should respect custom maxRetries', () => {
      mockRandom.mockReturnValue(0)

      const collidingId = `${adjectives[0]}-${nouns[0]}`
      expect(() => generateUserId([collidingId], 1)).toThrow()
    })

    it('should succeed on first try with empty existing list', () => {
      const id = generateUserId([])
      expect(id).toMatch(/^.+-.+$/)
    })
  })
})
