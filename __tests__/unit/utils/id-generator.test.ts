import { session } from '../__mocks__'
import { getNextId } from '@utils/id-generator'

jest.mock('@services/dynamodb')

describe('id-generator', () => {
  const mockGetById = jest.fn()
  const mockRandom = jest.fn()

  beforeAll(() => {
    Math.random = mockRandom.mockReturnValue(0.5)
  })

  describe('getNextId', () => {
    beforeAll(() => {
      mockGetById.mockRejectedValue(undefined)
    })

    it('should return generated ID when ID does not exist', async () => {
      const result = await getNextId(mockGetById)
      expect(result).toEqual('j2j2')
    })

    it('should generate a different ID when first ID already exists', async () => {
      mockGetById.mockResolvedValueOnce(session)
      mockRandom.mockReturnValueOnce(0.5)
      mockRandom.mockReturnValueOnce(0.25)
      const result = await getNextId(mockGetById)
      expect(result).toEqual('b2s2')
    })
  })
})
