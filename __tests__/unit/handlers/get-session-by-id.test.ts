import { session, sessionId } from '../__mocks__'
import eventJson from '@events/get-session-by-id.json'
import { getSessionByIdHandler } from '@handlers/get-session-by-id'
import * as dynamodb from '@services/dynamodb'
import { APIGatewayProxyEventV2 } from '@types'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('get-session-by-id', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    jest.mocked(dynamodb).getSessionById.mockResolvedValue(session)
  })

  describe('getSessionByIdHandler', () => {
    it('should return NOT_FOUND on getSessionById reject', async () => {
      jest.mocked(dynamodb).getSessionById.mockRejectedValueOnce(undefined)
      const result = await getSessionByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.NOT_FOUND))
    })

    it('should return OK when id exists', async () => {
      const result = await getSessionByIdHandler(event)
      expect(result).toEqual({ ...status.OK, body: JSON.stringify({ ...session, sessionId }) })
    })
  })
})
