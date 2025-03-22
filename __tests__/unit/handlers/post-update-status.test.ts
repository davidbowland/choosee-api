import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import * as utilsSession from '@utils/session'
import { APIGatewayProxyEventV2, Session } from '@types'
import { session, sessionId } from '../__mocks__'
import eventJson from '@events/post-update-status.json'
import { postUpdateStatus } from '@handlers/post-update-status'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')
jest.mock('@utils/session')

describe('post-update-status', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2
  const updatedSession = { ...session, status: { current: 'deciding', pageId: 3 } } as Session

  beforeAll(() => {
    mocked(dynamodb).getSessionById.mockResolvedValue(session)
    mocked(utilsSession).updateSessionStatus.mockResolvedValue(updatedSession)
  })

  describe('postUpdateStatus', () => {
    test('expect INTERNAL_SERVER_ERROR when getSessionById rejects', async () => {
      mocked(dynamodb).getSessionById.mockRejectedValueOnce(undefined)
      const result = await postUpdateStatus(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect INTERNAL_SERVER_ERROR when updateSessionStatus rejects', async () => {
      mocked(utilsSession).updateSessionStatus.mockRejectedValueOnce(undefined)
      const result = await postUpdateStatus(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect updated session passed to setSessionById', async () => {
      await postUpdateStatus(event)
      expect(mocked(dynamodb).setSessionById).toHaveBeenCalledWith(sessionId, updatedSession)
    })

    test('expect OK and updated session', async () => {
      const result = await postUpdateStatus(event)
      expect(result).toEqual(expect.objectContaining(status.OK))
      expect(JSON.parse(result.body)).toEqual(updatedSession)
    })
  })
})
