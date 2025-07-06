import { decodedJwt, jsonPatchOperations, newSession } from '../__mocks__'
import reverseEventJson from '@events/get-reverse-geocode.json'
import patchEventJson from '@events/patch-session.json'
import postSendTextToEventJson from '@events/post-send-text-to.json'
import postEventJson from '@events/post-session.json'
import { APIGatewayProxyEventV2, NewSession } from '@types'
import {
  extractJsonPatchFromEvent,
  extractJwtFromEvent,
  extractLatLngFromEvent,
  extractNewSessionFromEvent,
  extractTokenFromEvent,
  formatSession,
} from '@utils/events'

describe('events', () => {
  const epochTime = 1742760571384

  beforeAll(() => {
    Date.now = () => epochTime
  })

  describe('formatSession', () => {
    it('should throw error on missing address', () => {
      const invalidSession = { ...newSession, address: undefined }
      expect(() => formatSession(invalidSession)).toThrow()
    })

    it('should throw error when expiration is too far in the future', () => {
      const tooLateExpirationSession = { ...newSession, expiration: epochTime + 100_000_000_000 }
      expect(() => formatSession(tooLateExpirationSession)).toThrow()
    })

    it('should throw error when latitude is provided but longitude is not', () => {
      const noLongitudeSession = { ...newSession, latitude: 47, longitude: undefined }
      expect(() => formatSession(noLongitudeSession)).toThrow()
    })

    it('should throw error when longitude is provided but latitude is not', () => {
      const noLatitudeSession = { ...newSession, latitude: undefined, longitude: 84 }
      expect(() => formatSession(noLatitudeSession)).toThrow()
    })

    it.each([undefined, 'fnord'])('should throw error on invalid rankBy (%s)', (rankBy) => {
      const invalidRankBySession = { ...newSession, rankBy } as NewSession
      expect(() => formatSession(invalidRankBySession)).toThrow()
    })

    it.each([undefined, 0, 50_001])('should throw error when ranked by prominence and bad radius', (radius) => {
      const invalidRadiusSession = { ...newSession, radius, rankBy: 'POPULARITY' } as NewSession
      expect(() => formatSession(invalidRadiusSession)).toThrow()
    })

    it.each([undefined, 'fnord'])('should throw error on invalid type (%s)', (type) => {
      const invalidTypeSession = { ...newSession, type: type ? [type] : undefined } as NewSession
      expect(() => formatSession(invalidTypeSession)).toThrow()
    })

    it.each([undefined, 0, 11])('should throw error on invalid voterCount (%s)', (voterCount) => {
      const invalidVoterCountSession = { ...newSession, voterCount } as NewSession
      expect(() => formatSession(invalidVoterCountSession)).toThrow()
    })

    it('should return formatted session with valid expiration', () => {
      const result = formatSession(newSession)
      expect(result).toEqual(expect.objectContaining(newSession))
      expect(result.expiration).toBeGreaterThan(epochTime / 1000)
    })
  })

  describe('extractJsonPatchFromEvent', () => {
    it('should extract JSON patch operations from event', async () => {
      const result = await extractJsonPatchFromEvent(patchEventJson as unknown as APIGatewayProxyEventV2)
      expect(result).toEqual(jsonPatchOperations)
    })
  })

  describe('extractJwtFromEvent', () => {
    it('should successfully extract JWT payload from event', () => {
      const result = extractJwtFromEvent(postSendTextToEventJson as unknown as APIGatewayProxyEventV2)
      expect(result).toEqual(decodedJwt)
    })

    it('should return null when JWT is invalid', () => {
      const result = extractJwtFromEvent({
        ...postSendTextToEventJson,
        headers: {
          authorization: 'Bearer invalid jwt',
        },
      } as unknown as APIGatewayProxyEventV2)
      expect(result).toBe(null)
    })

    it('should return null when authorization header is missing', () => {
      const event = { ...postSendTextToEventJson, headers: {} } as unknown as APIGatewayProxyEventV2
      const result = extractJwtFromEvent(event)
      expect(result).toBe(null)
    })
  })

  describe('extractLatLngFromEvent', () => {
    const event = reverseEventJson as unknown as APIGatewayProxyEventV2
    const expectedResult = { latitude: 38.897957, longitude: -77.03656 }

    it('should extract latitude and longitude from event', async () => {
      const result = extractLatLngFromEvent(event)
      expect(result).toEqual(expectedResult)
    })

    it.each([undefined, -91, 91])('should throw exception when latitude is invalid (%s)', async (latitude) => {
      const invalidLatEvent = {
        ...event,
        queryStringParameters: { ...event.queryStringParameters, latitude },
      } as unknown as APIGatewayProxyEventV2
      expect(() => extractLatLngFromEvent(invalidLatEvent)).toThrow()
    })

    it.each([undefined, -181, 181])('should throw exception when longitude is invalid (%s)', async (longitude) => {
      const invalidLngEvent = {
        ...event,
        queryStringParameters: { ...event.queryStringParameters, longitude },
      } as unknown as APIGatewayProxyEventV2
      expect(() => extractLatLngFromEvent(invalidLngEvent)).toThrow()
    })
  })

  describe('extractNewSessionFromEvent', () => {
    const event = postEventJson as unknown as APIGatewayProxyEventV2

    it('should extract session data from event', async () => {
      const result = await extractNewSessionFromEvent(event)
      expect(result).toEqual(expect.objectContaining(newSession))
    })

    it('should extract session data from base64 encoded event', async () => {
      const tempEvent = {
        ...event,
        body: Buffer.from(event.body).toString('base64'),
        isBase64Encoded: true,
      } as unknown as APIGatewayProxyEventV2
      const result = await extractNewSessionFromEvent(tempEvent)
      expect(result).toEqual(expect.objectContaining(newSession))
    })

    it('should throw error when event contains invalid session data', async () => {
      const tempEvent = { ...event, body: JSON.stringify({}) } as unknown as APIGatewayProxyEventV2
      expect(() => extractNewSessionFromEvent(tempEvent)).toThrow()
    })
  })

  describe('extractTokenFromEvent', () => {
    const event = postEventJson as unknown as APIGatewayProxyEventV2
    it('should extract token from event query parameters', async () => {
      const result = extractTokenFromEvent(event)
      expect(result).toEqual('ytrewsdfghjmnbgtyu')
    })
  })
})
