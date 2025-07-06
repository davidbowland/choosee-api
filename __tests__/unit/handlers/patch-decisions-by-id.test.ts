import { decision, session, sessionId, userId } from '../__mocks__'
import eventJson from '@events/patch-decisions-by-id.json'
import { patchDecisionByIdHandler } from '@handlers/patch-decisions-by-id'
import * as dynamodb from '@services/dynamodb'
import { APIGatewayProxyEventV2, Decision } from '@types'
import * as events from '@utils/events'
import * as sessionUtils from '@utils/session'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/events')
jest.mock('@utils/logging')
jest.mock('@utils/session')

describe('patch-decisions-by-id', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2
  const expectedResult: Decision = {
    decisions: { "Shakespeare's Pizza - Downtown": false },
    expiration: 1728533252,
  }
  const jwt = {
    phone_number: '+15551234567',
  } as any

  beforeAll(() => {
    jest.mocked(dynamodb).getDecisionById.mockResolvedValue(decision)
    jest.mocked(dynamodb).getSessionById.mockResolvedValue(session)
    jest.mocked(events).extractJsonPatchFromEvent.mockImplementation((event) => JSON.parse(event.body))
    jest.mocked(events).extractJwtFromEvent.mockReturnValue(jwt)
    jest.mocked(sessionUtils).updateSessionStatus.mockImplementation(async (sessionId, session) => session)
  })

  describe('patchDecisionByIdHandler', () => {
    it("should return FORBIDDEN when userId doesn't match JWT", async () => {
      jest.mocked(events).extractJwtFromEvent.mockReturnValueOnce({ phone_number: 'doesnt_match' } as any)
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.FORBIDDEN))
    })

    it('should return BAD_REQUEST when unable to parse body', async () => {
      jest.mocked(events).extractJsonPatchFromEvent.mockImplementationOnce(() => {
        throw new Error('Bad request')
      })
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual(expect.objectContaining({ statusCode: status.BAD_REQUEST.statusCode }))
    })

    it('should return BAD_REQUEST when extractJsonPatchFromEvent throws', async () => {
      jest.mocked(events).extractJsonPatchFromEvent.mockImplementationOnce(() => {
        throw new Error('Bad request')
      })
      const result = await patchDecisionByIdHandler(event)
      expect(result.statusCode).toEqual(status.BAD_REQUEST.statusCode)
    })

    it('should return NOT_FOUND on getDecisionById reject', async () => {
      jest.mocked(dynamodb).getDecisionById.mockRejectedValueOnce(undefined)
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual(status.NOT_FOUND)
    })

    it('should return BAD_REQUEST when JSON patch invalid', async () => {
      jest.mocked(events).extractJsonPatchFromEvent.mockReturnValueOnce([{ op: 'fnord' }] as any)
      const result = await patchDecisionByIdHandler(event)
      expect(result.statusCode).toEqual(status.BAD_REQUEST.statusCode)
    })

    it('should return INTERNAL_SERVER_ERROR on setDecisionById reject', async () => {
      jest.mocked(dynamodb).setDecisionById.mockRejectedValueOnce(undefined)
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    it('should return INTERNAL_SERVER_ERROR on setSessionById reject', async () => {
      jest.mocked(dynamodb).setSessionById.mockRejectedValueOnce(undefined)
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    it('should call setDecisionById with updated object', async () => {
      await patchDecisionByIdHandler(event)
      expect(dynamodb.setDecisionById).toHaveBeenCalledWith(sessionId, userId, expectedResult)
    })

    it('should invoke updateSessionStatus', async () => {
      await patchDecisionByIdHandler(event)
      expect(sessionUtils.updateSessionStatus).toHaveBeenCalledWith(sessionId, session)
    })

    it('should call setSessionById with updated object', async () => {
      await patchDecisionByIdHandler(event)
      expect(dynamodb.setSessionById).toHaveBeenCalledWith(sessionId, session)
    })

    it('should return OK and body when ID exists', async () => {
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify(expectedResult),
      })
    })

    it('should return OK and body when ID does not exist', async () => {
      jest.mocked(dynamodb).getDecisionById.mockResolvedValueOnce({ ...decision, decisions: {} })
      const result = await patchDecisionByIdHandler({
        ...event,
        body: JSON.stringify([{ op: 'add', path: "/decisions/Shakespeare's Pizza - Downtown", value: false }]),
      })
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify(expectedResult),
      })
    })

    it('should return OK and results when no JWT provided', async () => {
      jest.mocked(events).extractJwtFromEvent.mockReturnValueOnce(undefined)
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify(expectedResult),
      })
    })
  })
})
