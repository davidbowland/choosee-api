import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import { session, sessionId } from '../__mocks__'
import { APIGatewayProxyEventV2 } from '@types'
import eventJson from '@events/get-session-by-id.json'
import { getSessionByIdHandler } from '@handlers/get-session-by-id'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('get-session-by-id', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    mocked(dynamodb).getSessionById.mockResolvedValue(session)
  })

  describe('getSessionByIdHandler', () => {
    test('expect NOT_FOUND on getSessionById reject', async () => {
      mocked(dynamodb).getSessionById.mockRejectedValueOnce(undefined)
      const result = await getSessionByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.NOT_FOUND))
    })

    test('expect OK when id exists', async () => {
      const result = await getSessionByIdHandler(event)
      expect(result).toEqual({ ...status.OK, body: JSON.stringify({ ...session, sessionId }) })
    })
  })
})
