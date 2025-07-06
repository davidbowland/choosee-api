import { decodedJwt, session, sessionId } from '../__mocks__'
import eventJson from '@events/patch-session.json'
import { patchSessionHandler } from '@handlers/patch-session'
import * as dynamodb from '@services/dynamodb'
import { APIGatewayProxyEventV2, PatchOperation, Session } from '@types'
import * as events from '@utils/events'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/events')
jest.mock('@utils/logging')

describe('patch-session', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2
  const expectedResult = { ...session, voterCount: 1 } as Session

  beforeAll(() => {
    jest.mocked(dynamodb).getSessionById.mockResolvedValue(session)
    jest.mocked(events).extractJsonPatchFromEvent.mockImplementation((event) => JSON.parse(event.body))
    jest.mocked(events).extractJwtFromEvent.mockReturnValue(null)
  })

  describe('patchSessionHandler', () => {
    it('should return BAD_REQUEST when unable to parse body', async () => {
      jest.mocked(events).extractJsonPatchFromEvent.mockImplementationOnce(() => {
        throw new Error('Bad request')
      })
      const result = await patchSessionHandler(event)
      expect(result).toEqual(expect.objectContaining({ statusCode: status.BAD_REQUEST.statusCode }))
    })

    it('should return BAD_REQUEST when patch operations are invalid', async () => {
      jest
        .mocked(events)
        .extractJsonPatchFromEvent.mockReturnValueOnce([
          { op: 'replace', path: '/fnord' },
        ] as unknown[] as PatchOperation[])
      const result = await patchSessionHandler(event)
      expect(result.statusCode).toEqual(status.BAD_REQUEST.statusCode)
    })

    it('should return BAD_REQUEST when extractJsonPatchFromEvent throws', async () => {
      jest.mocked(events).extractJsonPatchFromEvent.mockImplementationOnce(() => {
        throw new Error('Bad request')
      })
      const result = await patchSessionHandler(event)
      expect(result.statusCode).toEqual(status.BAD_REQUEST.statusCode)
    })

    it("should return FORBIDDEN when owner doesn't match subject", async () => {
      jest.mocked(dynamodb).getSessionById.mockResolvedValueOnce({ ...session, owner: '0okjh7-9ijhg-ergtyy' })
      jest.mocked(events).extractJwtFromEvent.mockReturnValueOnce({ ...decodedJwt, sub: '54rtyjg-6yght6uh-87yuik' })
      const result = await patchSessionHandler(event)
      expect(result.statusCode).toEqual(status.FORBIDDEN.statusCode)
    })

    it('should return FORBIDDEN when patching invalid item', async () => {
      jest.mocked(dynamodb).getSessionById.mockResolvedValueOnce({ ...session, owner: decodedJwt.sub })
      jest
        .mocked(events)
        .extractJsonPatchFromEvent.mockReturnValueOnce([{ op: 'replace', path: '/address', value: '90036' }])
      jest.mocked(events).extractJwtFromEvent.mockReturnValueOnce(decodedJwt)
      const result = await patchSessionHandler(event)
      expect(result.statusCode).toEqual(status.FORBIDDEN.statusCode)
    })

    it('should return NOT_FOUND on getSessionById reject', async () => {
      jest.mocked(dynamodb).getSessionById.mockRejectedValueOnce(undefined)
      const result = await patchSessionHandler(event)
      expect(result).toEqual(expect.objectContaining(status.NOT_FOUND))
    })

    it('should return INTERNAL_SERVER_ERROR on setSessionById reject', async () => {
      jest.mocked(dynamodb).setSessionById.mockRejectedValueOnce(undefined)
      const result = await patchSessionHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    it('should call setSessionById with updated object', async () => {
      await patchSessionHandler(event)
      expect(dynamodb.setSessionById).toHaveBeenCalledWith(sessionId, expectedResult)
    })

    it('should return OK and body', async () => {
      const result = await patchSessionHandler(event)
      expect(result).toEqual(expect.objectContaining(status.OK))
      expect(JSON.parse(result.body)).toEqual({ ...expectedResult, sessionId })
    })

    it('should return OK and body when owner matches JWT', async () => {
      jest.mocked(dynamodb).getSessionById.mockResolvedValueOnce({ ...session, owner: decodedJwt.sub })
      jest.mocked(events).extractJwtFromEvent.mockReturnValueOnce(decodedJwt)
      const result = await patchSessionHandler(event)
      expect(result).toEqual(expect.objectContaining(status.OK))
      expect(JSON.parse(result.body)).toEqual({ ...expectedResult, owner: decodedJwt.sub, sessionId })
    })
  })
})
