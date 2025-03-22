import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import { sessionId, userId } from '../__mocks__'
import { APIGatewayProxyEventV2 } from '@types'
import eventJson from '@events/post-start-prune.json'
import { postStartPruneHandler } from '@handlers/post-start-prune'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('post-start-prune', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    mocked(dynamodb).deleteDecisionById.mockResolvedValue(undefined)
    mocked(dynamodb).deleteSessionById.mockResolvedValue(undefined)
    mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValue([userId])
    mocked(dynamodb).scanExpiredSessionIds.mockResolvedValue([sessionId])
  })

  describe('postStartPruneHandler', () => {
    test('expect INTERNAL_SERVER_ERROR when scanExpiredSessionIds rejects', async () => {
      mocked(dynamodb).scanExpiredSessionIds.mockRejectedValueOnce(undefined)
      const result = await postStartPruneHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect INTERNAL_SERVER_ERROR when deleteSessionById rejects', async () => {
      mocked(dynamodb).deleteSessionById.mockRejectedValueOnce(undefined)
      const result = await postStartPruneHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect INTERNAL_SERVER_ERROR when deleteDecisionById rejects', async () => {
      mocked(dynamodb).deleteDecisionById.mockRejectedValueOnce(undefined)
      const result = await postStartPruneHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect sessionId and userId passed to deleteDecisionById', async () => {
      await postStartPruneHandler(event)
      expect(mocked(dynamodb).deleteDecisionById).toHaveBeenCalledWith(sessionId, userId)
    })

    test('expect sessionId passed to deleteSessionById', async () => {
      await postStartPruneHandler(event)
      expect(mocked(dynamodb).deleteSessionById).toHaveBeenCalledWith(sessionId)
    })

    test('expect NO_CONTENT', async () => {
      const result = await postStartPruneHandler(event)
      expect(result).toEqual(expect.objectContaining(status.NO_CONTENT))
    })
  })
})
