import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import { getNextId } from '@utils/id-generator'
import { session } from '../__mocks__'

jest.mock('@services/dynamodb')

describe('id-generator', () => {
  const mathRandom = Math.random
  const mockRandom = jest.fn()

  beforeAll(() => {
    Math.random = mockRandom.mockReturnValue(0.5)
  })

  afterAll(() => {
    Math.random = mathRandom
  })

  describe('getNextId', () => {
    beforeAll(() => {
      mocked(dynamodb).getSessionById.mockRejectedValue(undefined)
    })

    test('expect id returned passed to setDataById', async () => {
      const result = await getNextId()
      expect(result).toEqual('j2j2')
    })

    test('expect second sessionId when first exists', async () => {
      mocked(dynamodb).getSessionById.mockResolvedValueOnce(session)
      mockRandom.mockReturnValueOnce(0.5)
      mockRandom.mockReturnValueOnce(0.25)
      const result = await getNextId()
      expect(result).toEqual('b2s2')
    })
  })
})
