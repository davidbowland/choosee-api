import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import * as events from '@utils/events'
import * as sessionUtils from '@utils/session'
import { APIGatewayProxyEventV2, Decision } from '@types'
import { decision, session, sessionId, userId } from '../__mocks__'
import eventJson from '@events/patch-decisions-by-id.json'
import { patchDecisionByIdHandler } from '@handlers/patch-decisions-by-id'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/events')
jest.mock('@utils/logging')
jest.mock('@utils/session')

describe('patch-decisions-by-id', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2
  const expectedResult: Decision = {
    decisions: { "Shakespeare's Pizza - Downtown": false },
  }
  const jwt = {
    phone_number: '+15551234567',
  }

  beforeAll(() => {
    mocked(dynamodb).getDecisionById.mockResolvedValue(decision)
    mocked(dynamodb).getSessionById.mockResolvedValue(session)
    mocked(events).extractJsonPatchFromEvent.mockImplementation((event) => JSON.parse(event.body))
    mocked(events).extractJwtFromEvent.mockReturnValue(jwt)
    mocked(sessionUtils).updateSessionStatus.mockImplementation(async (sessionId, session) => session)
  })

  describe('patchDecisionByIdHandler', () => {
    test("expect FORBIDDEN when userId doesn't match JWT", async () => {
      mocked(events).extractJwtFromEvent.mockReturnValueOnce({ phone_number: 'doesnt_match' })
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.FORBIDDEN))
    })

    test('expect BAD_REQUEST when unable to parse body', async () => {
      mocked(events).extractJsonPatchFromEvent.mockImplementationOnce(() => {
        throw new Error('Bad request')
      })
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual(expect.objectContaining({ statusCode: status.BAD_REQUEST.statusCode }))
    })

    test('expect BAD_REQUEST when extractJsonPatchFromEvent throws', async () => {
      mocked(events).extractJsonPatchFromEvent.mockImplementationOnce(() => {
        throw new Error('Bad request')
      })
      const result = await patchDecisionByIdHandler(event)
      expect(result.statusCode).toEqual(status.BAD_REQUEST.statusCode)
    })

    test('expect NOT_FOUND on getDecisionById reject', async () => {
      mocked(dynamodb).getDecisionById.mockRejectedValueOnce(undefined)
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual(status.NOT_FOUND)
    })

    test('expect BAD_REQUEST when JSON patch invalid', async () => {
      mocked(events).extractJsonPatchFromEvent.mockReturnValueOnce([{ op: 'fnord' }] as any)
      const result = await patchDecisionByIdHandler(event)
      expect(result.statusCode).toEqual(status.BAD_REQUEST.statusCode)
    })

    test('expect INTERNAL_SERVER_ERROR on setDecisionById reject', async () => {
      mocked(dynamodb).setDecisionById.mockRejectedValueOnce(undefined)
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect INTERNAL_SERVER_ERROR on setSessionById reject', async () => {
      mocked(dynamodb).setSessionById.mockRejectedValueOnce(undefined)
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect setDecisionById called with updated object', async () => {
      await patchDecisionByIdHandler(event)
      expect(mocked(dynamodb).setDecisionById).toHaveBeenCalledWith(sessionId, userId, expectedResult)
    })

    test('expect updateSessionStatus invoked', async () => {
      await patchDecisionByIdHandler(event)
      expect(mocked(sessionUtils).updateSessionStatus).toHaveBeenCalledWith(sessionId, session)
    })

    test('expect setSessionById called with updated object', async () => {
      await patchDecisionByIdHandler(event)
      expect(mocked(dynamodb).setSessionById).toHaveBeenCalledWith(sessionId, session)
    })

    test('expect OK and body when ID exists', async () => {
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify({ decisions: { "Shakespeare's Pizza - Downtown": false } }),
      })
    })

    test('expect OK and body when ID does not exist', async () => {
      mocked(dynamodb).getDecisionById.mockResolvedValueOnce({ ...decision, decisions: {} })
      const result = await patchDecisionByIdHandler({
        ...event,
        body: JSON.stringify([{ op: 'add', path: "/decisions/Shakespeare's Pizza - Downtown", value: false }]),
      })
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify({ decisions: { "Shakespeare's Pizza - Downtown": false } }),
      })
    })

    test('expect OK and results when no JWT provided', async () => {
      mocked(events).extractJwtFromEvent.mockReturnValueOnce(undefined)
      const result = await patchDecisionByIdHandler(event)
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify({ decisions: { "Shakespeare's Pizza - Downtown": false } }),
      })
    })
  })
})
