import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import * as events from '@utils/events'
import { APIGatewayProxyEventV2, PatchOperation, Session } from '@types'
import { decodedJwt, session, sessionId } from '../__mocks__'
import eventJson from '@events/patch-item.json'
import { patchItemHandler } from '@handlers/patch-item'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/events')
jest.mock('@utils/logging')

describe('patch-item', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2
  const expectedResult = { ...session, voterCount: 1 } as Session

  beforeAll(() => {
    mocked(dynamodb).getSessionById.mockResolvedValue(session)
    mocked(events).extractJsonPatchFromEvent.mockImplementation((event) => JSON.parse(event.body))
    mocked(events).extractJwtFromEvent.mockReturnValue(null)
  })

  describe('patchItemHandler', () => {
    test('expect BAD_REQUEST when unable to parse body', async () => {
      mocked(events).extractJsonPatchFromEvent.mockImplementationOnce(() => {
        throw new Error('Bad request')
      })
      const result = await patchItemHandler(event)
      expect(result).toEqual(expect.objectContaining({ statusCode: status.BAD_REQUEST.statusCode }))
    })

    test('expect BAD_REQUEST when patch operations are invalid', async () => {
      mocked(events).extractJsonPatchFromEvent.mockReturnValueOnce([
        { op: 'replace', path: '/fnord' },
      ] as unknown[] as PatchOperation[])
      const result = await patchItemHandler(event)
      expect(result.statusCode).toEqual(status.BAD_REQUEST.statusCode)
    })

    test('expect BAD_REQUEST when extractJsonPatchFromEvent throws', async () => {
      mocked(events).extractJsonPatchFromEvent.mockImplementationOnce(() => {
        throw new Error('Bad request')
      })
      const result = await patchItemHandler(event)
      expect(result.statusCode).toEqual(status.BAD_REQUEST.statusCode)
    })

    test("expect FORBIDDEN when owner doesn't match subject", async () => {
      mocked(dynamodb).getSessionById.mockResolvedValueOnce({ ...session, owner: '0okjh7-9ijhg-ergtyy' })
      mocked(events).extractJwtFromEvent.mockReturnValueOnce({ ...decodedJwt, sub: '54rtyjg-6yght6uh-87yuik' })
      const result = await patchItemHandler(event)
      expect(result.statusCode).toEqual(status.FORBIDDEN.statusCode)
    })

    test('expect FORBIDDEN when patching invalid item', async () => {
      mocked(dynamodb).getSessionById.mockResolvedValueOnce({ ...session, owner: decodedJwt.sub })
      mocked(events).extractJsonPatchFromEvent.mockReturnValueOnce([
        { op: 'replace', path: '/address', value: '90036' },
      ])
      mocked(events).extractJwtFromEvent.mockReturnValueOnce(decodedJwt)
      const result = await patchItemHandler(event)
      expect(result.statusCode).toEqual(status.FORBIDDEN.statusCode)
    })

    test('expect NOT_FOUND on getSessionById reject', async () => {
      mocked(dynamodb).getSessionById.mockRejectedValueOnce(undefined)
      const result = await patchItemHandler(event)
      expect(result).toEqual(expect.objectContaining(status.NOT_FOUND))
    })

    test('expect INTERNAL_SERVER_ERROR on setSessionById reject', async () => {
      mocked(dynamodb).setSessionById.mockRejectedValueOnce(undefined)
      const result = await patchItemHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect setSessionById called with updated object', async () => {
      await patchItemHandler(event)
      expect(mocked(dynamodb).setSessionById).toHaveBeenCalledWith(sessionId, expectedResult)
    })

    test('expect OK and body', async () => {
      const result = await patchItemHandler(event)
      expect(result).toEqual(expect.objectContaining(status.OK))
      expect(JSON.parse(result.body)).toEqual({ ...expectedResult, sessionId })
    })

    test('expect OK and body when owner matches JWT', async () => {
      mocked(dynamodb).getSessionById.mockResolvedValueOnce({ ...session, owner: decodedJwt.sub })
      mocked(events).extractJwtFromEvent.mockReturnValueOnce(decodedJwt)
      const result = await patchItemHandler(event)
      expect(result).toEqual(expect.objectContaining(status.OK))
      expect(JSON.parse(result.body)).toEqual({ ...expectedResult, owner: decodedJwt.sub, sessionId })
    })
  })
})
