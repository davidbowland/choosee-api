import { getNextId } from '@utils/id-generator'
import { session } from '../__mocks__'

jest.mock('@services/dynamodb')

describe('id-generator', () => {
  Math.random
  const mockGetById = jest.fn()
  const mockRandom = jest.fn()

  beforeAll(() => {
    Math.random = mockRandom.mockReturnValue(0.5)
  })

  describe('getNextId', () => {
    beforeAll(() => {
      mockGetById.mockRejectedValue(undefined)
    })

    test('expect id returned passed to getSessionById', async () => {
      const result = await getNextId(mockGetById)
      expect(result).toEqual('j2j2')
    })

    test('expect second sessionId when first exists', async () => {
      mockGetById.mockResolvedValueOnce(session)
      mockRandom.mockReturnValueOnce(0.5)
      mockRandom.mockReturnValueOnce(0.25)
      const result = await getNextId(mockGetById)
      expect(result).toEqual('b2s2')
    })
  })
})
