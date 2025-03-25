import { APIGatewayProxyEventV2, NewSession } from '@types'
import { decodedJwt, jsonPatchOperations, newSession } from '../__mocks__'
import {
  extractJsonPatchFromEvent,
  extractJwtFromEvent,
  extractLatLngFromEvent,
  extractNewSessionFromEvent,
  extractTokenFromEvent,
  formatSession,
} from '@utils/events'
import patchEventJson from '@events/patch-session.json'
import postEventJson from '@events/post-session.json'
import postSendTextToEventJson from '@events/post-send-text-to.json'
import reverseEventJson from '@events/get-reverse-geocode.json'

describe('events', () => {
  beforeAll(() => {
    jest.spyOn(Date.prototype, 'getTime').mockReturnValue(1_742_760_571_384)
  })

  describe('formatSession', () => {
    test('expect error on missing address', () => {
      const invalidSession = { ...newSession, address: undefined }
      expect(() => formatSession(invalidSession)).toThrow()
    })

    test('expect error when expiration too late session', () => {
      const tooLateExpirationSession = { ...newSession, expiration: new Date().getTime() + 100_000_000_000 }
      expect(() => formatSession(tooLateExpirationSession)).toThrow()
    })

    test('expect error when latitude provided by longitude not', () => {
      const noLongitudeSession = { ...newSession, latitude: 47, longitude: undefined }
      expect(() => formatSession(noLongitudeSession)).toThrow()
    })

    test('expect error when longitude provided by latitude not', () => {
      const noLatitudeSession = { ...newSession, latitude: undefined, longitude: 84 }
      expect(() => formatSession(noLatitudeSession)).toThrow()
    })

    test.each([undefined, 'fnord'])('expect error on invalid rankBy (%s)', (rankBy) => {
      const invalidRankBySession = { ...newSession, rankBy } as NewSession
      expect(() => formatSession(invalidRankBySession)).toThrow()
    })

    test.each([undefined, 0, 50_001])('expect error when ranked by prominence and bad radius', (radius) => {
      const invalidRadiusSession = { ...newSession, radius, rankBy: 'POPULARITY' } as NewSession
      expect(() => formatSession(invalidRadiusSession)).toThrow()
    })

    test.each([undefined, 'fnord'])('expect error on invalid type (%s)', (type) => {
      const invalidTypeSession = { ...newSession, type: type ? [type] : undefined } as NewSession
      expect(() => formatSession(invalidTypeSession)).toThrow()
    })

    test.each([undefined, 0, 11])('expect error on invalid voterCount (%s)', (voterCount) => {
      const invalidVoterCountSession = { ...newSession, voterCount } as NewSession
      expect(() => formatSession(invalidVoterCountSession)).toThrow()
    })

    test('expect formatted session returned', () => {
      const result = formatSession(newSession)
      expect(result).toEqual(expect.objectContaining(newSession))
      expect(result.expiration).toBeGreaterThan(new Date().getTime())
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
      const result = extractJwtFromEvent(postSendTextToEventJson as unknown as APIGatewayProxyEventV2)
      expect(result).toEqual(decodedJwt)
    })

    test('expect null on invalid JWT', () => {
      const result = extractJwtFromEvent({
        ...postSendTextToEventJson,
        headers: {
          authorization: 'Bearer invalid jwt',
        },
      } as unknown as APIGatewayProxyEventV2)
      expect(result).toBe(null)
    })

    test('expect null on missing header', () => {
      const event = { ...postSendTextToEventJson, headers: {} } as unknown as APIGatewayProxyEventV2
      const result = extractJwtFromEvent(event)
      expect(result).toBe(null)
    })
  })

  describe('extractLatLngFromEvent', () => {
    const event = reverseEventJson as unknown as APIGatewayProxyEventV2
    const expectedResult = { latitude: 38.897957, longitude: -77.03656 }

    test('expect LatLng extracted from event', async () => {
      const result = extractLatLngFromEvent(event)
      expect(result).toEqual(expectedResult)
    })

    test.each([undefined, -91, 91])('expect exception when latitude is invalid (%s)', async (latitude) => {
      const invalidLatEvent = {
        ...event,
        queryStringParameters: { ...event.queryStringParameters, latitude },
      } as unknown as APIGatewayProxyEventV2
      expect(() => extractLatLngFromEvent(invalidLatEvent)).toThrow()
    })

    test.each([undefined, -181, 181])('expect exception when longitude is invalid (%s)', async (longitude) => {
      const invalidLngEvent = {
        ...event,
        queryStringParameters: { ...event.queryStringParameters, longitude },
      } as unknown as APIGatewayProxyEventV2
      expect(() => extractLatLngFromEvent(invalidLngEvent)).toThrow()
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
  })

  describe('extractTokenFromEvent', () => {
    const event = postEventJson as unknown as APIGatewayProxyEventV2
    test('expect token extracted from event', async () => {
      const result = extractTokenFromEvent(event)
      expect(result).toEqual('ytrewsdfghjmnbgtyu')
    })
  })
})
