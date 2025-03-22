import { APIGatewayProxyEventV2, NewSession } from '@types'
import { decodedJwt, jsonPatchOperations, newSession } from '../__mocks__'
import {
  extractJsonPatchFromEvent,
  extractJwtFromEvent,
  extractNewSessionFromEvent,
  extractTokenFromEvent,
  formatSession,
} from '@utils/events'
import patchEventJson from '@events/patch-item.json'
import postEventJson from '@events/post-item.json'
import postSendTextEventJson from '@events/post-send-text.json'

describe('events', () => {
  describe('formatSession', () => {
    test('expect error on missing address', () => {
      const invalidSession = { ...newSession, address: undefined }
      expect(() => formatSession(invalidSession)).toThrow()
    })

    test('expect error when expiration too late session', () => {
      const tooLateExpirationSession = { ...newSession, expiration: new Date().getTime() + 100_000_000_000 }
      expect(() => formatSession(tooLateExpirationSession)).toThrow()
    })

    test.each([-1, 5])('expect error on invalid maxPrice (%s)', (maxPrice) => {
      const invalidSession = { ...newSession, maxPrice } as NewSession
      expect(() => formatSession(invalidSession)).toThrow()
    })

    test.each([-1, 5])('expect error on invalid minPrice (%s)', (minPrice) => {
      const invalidSession = { ...newSession, minPrice } as NewSession
      expect(() => formatSession(invalidSession)).toThrow()
    })

    test('expect error when maxPrice less than minPrice', () => {
      const invalidSession = { ...newSession, maxPrice: 0, minPrice: 4 } as NewSession
      expect(() => formatSession(invalidSession)).toThrow()
    })

    test.each([0, 4])('expect error on invalid pagesPerRound (%s)', (pagesPerRound) => {
      const invalidSession = { ...newSession, pagesPerRound } as NewSession
      expect(() => formatSession(invalidSession)).toThrow()
    })

    test.each([undefined, 'fnord'])('expect error on invalid rankBy (%s)', (rankBy) => {
      const invalidSession = { ...newSession, rankBy } as NewSession
      expect(() => formatSession(invalidSession)).toThrow()
    })

    test.each([undefined, 0, 50_001])('expect error when ranked by prominence and bad radius', (radius) => {
      const invalidSession = { ...newSession, radius, rankBy: 'prominence' } as NewSession
      expect(() => formatSession(invalidSession)).toThrow()
    })

    test.each([undefined, 'fnord'])('expect error on invalid type (%s)', (type) => {
      const invalidSession = { ...newSession, type } as NewSession
      expect(() => formatSession(invalidSession)).toThrow()
    })

    test.each([undefined, 0, 11])('expect error on invalid voterCount (%s)', (voterCount) => {
      const invalidSession = { ...newSession, voterCount } as NewSession
      expect(() => formatSession(invalidSession)).toThrow()
    })

    test('expect formatted session returned', () => {
      const result = formatSession(newSession)
      expect(result).toEqual(expect.objectContaining(newSession))
      expect(result.expiration).toBeGreaterThan(new Date().getTime())
    })
  })

  describe('extractNewSessionFromEvent', () => {
    const event = postEventJson as unknown as APIGatewayProxyEventV2

    test('expect session from event', async () => {
      const result = await extractNewSessionFromEvent(event)
      expect(result).toEqual(expect.objectContaining(newSession))
    })

    test('expect session from event in base64', async () => {
      const tempEvent = {
        ...event,
        body: Buffer.from(event.body).toString('base64'),
        isBase64Encoded: true,
      } as unknown as APIGatewayProxyEventV2
      const result = await extractNewSessionFromEvent(tempEvent)
      expect(result).toEqual(expect.objectContaining(newSession))
    })

    test('expect reject on invalid event', async () => {
      const tempEvent = { ...event, body: JSON.stringify({}) } as unknown as APIGatewayProxyEventV2
      expect(() => extractNewSessionFromEvent(tempEvent)).toThrow()
    })

    test('expect session to be formatted', async () => {
      const tempEmail = {
        ...newSession,
        foo: 'bar',
      }
      const tempEvent = { ...event, body: JSON.stringify(tempEmail) } as unknown as APIGatewayProxyEventV2
      const result = await extractNewSessionFromEvent(tempEvent)
      expect(result).toEqual(expect.objectContaining(newSession))
    })
  })

  describe('extractJsonPatchFromEvent', () => {
    test('expect preference from event', async () => {
      const result = await extractJsonPatchFromEvent(patchEventJson as unknown as APIGatewayProxyEventV2)
      expect(result).toEqual(jsonPatchOperations)
    })
  })

  describe('extractJwtFromEvent', () => {
    test('expect payload successfully extracted', () => {
      const result = extractJwtFromEvent(postSendTextEventJson as unknown as APIGatewayProxyEventV2)
      expect(result).toEqual(decodedJwt)
    })

    test('expect null on invalid JWT', () => {
      const result = extractJwtFromEvent({
        ...postSendTextEventJson,
        headers: {
          authorization: 'Bearer invalid jwt',
        },
      } as unknown as APIGatewayProxyEventV2)
      expect(result).toBe(null)
    })

    test('expect null on missing header', () => {
      const event = { ...postSendTextEventJson, headers: {} } as unknown as APIGatewayProxyEventV2
      const result = extractJwtFromEvent(event)
      expect(result).toBe(null)
    })
  })

  describe('extractTokenFromEvent', () => {
    const event = postEventJson as unknown as APIGatewayProxyEventV2
    test('expect token extracted from event', async () => {
      const result = extractTokenFromEvent(event)
      expect(result).toEqual('ytrewsdfghjmnbgtyu')
    })
  })
})
