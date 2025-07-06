import { decodedJwt, geocodedAddress, newSession, place1, sessionId } from '../__mocks__'
import eventJson from '@events/post-session.json'
import { postSessionHandlerAuthenticated, postSessionHandlerUnauthenticated } from '@handlers/post-session'
import * as dynamodb from '@services/dynamodb'
import * as googleMaps from '@services/google-maps'
import * as recaptcha from '@services/recaptcha'
import { APIGatewayProxyEventV2 } from '@types'
import * as events from '@utils/events'
import * as idGenerator from '@utils/id-generator'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@services/google-maps')
jest.mock('@services/recaptcha')
jest.mock('@utils/events')
jest.mock('@utils/id-generator')
jest.mock('@utils/logging')

describe('post-session', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    jest.mocked(events).extractJwtFromEvent.mockReturnValue(null)
    jest.mocked(events).extractNewSessionFromEvent.mockReturnValue(newSession)
    jest.mocked(googleMaps).fetchGeocodeResults.mockResolvedValue(geocodedAddress)
    jest.mocked(googleMaps).fetchPlaceResults.mockResolvedValue([place1])
    jest.mocked(idGenerator).getNextId.mockResolvedValue(sessionId)
    jest.mocked(recaptcha).getScoreFromEvent.mockResolvedValue(1)
  })

  describe('postSessionHandlerAuthenticated', () => {
    it('should return BAD_REQUEST when new session is invalid', async () => {
      jest.mocked(events).extractNewSessionFromEvent.mockImplementationOnce(() => {
        throw new Error('Bad request')
      })
      const result = await postSessionHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.BAD_REQUEST))
    })

    it('should return INTERNAL_SERVER_ERROR when fetchPlaceResults rejects from geocode', async () => {
      jest.mocked(googleMaps).fetchPlaceResults.mockRejectedValueOnce({
        response: { data: { message: 'Invalid address' }, status: status.BAD_REQUEST.statusCode },
      })
      const result = await postSessionHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    it('should pass sessionId to setSessionById', async () => {
      await postSessionHandlerAuthenticated(event)
      expect(dynamodb.setSessionById).toHaveBeenCalledWith('abc123', expect.objectContaining(newSession))
    })

    it('should return INTERNAL_SERVER_ERROR on setSessionById reject', async () => {
      jest.mocked(dynamodb).setSessionById.mockRejectedValueOnce(undefined)
      const result = await postSessionHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    it('should not call fetchGeocodeResults when latitude and longitude are passed', async () => {
      const sessionWithLatLong = { ...newSession, latitude: 39.0013395, longitude: -92.3128326 }
      jest.mocked(events).extractNewSessionFromEvent.mockReturnValueOnce(sessionWithLatLong)
      await postSessionHandlerAuthenticated(event)
      expect(googleMaps.fetchGeocodeResults).not.toHaveBeenCalled()
    })

    it('should return CREATED and body', async () => {
      const result = await postSessionHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.CREATED))
      expect(googleMaps.fetchPlaceResults).toHaveBeenCalledWith(
        { latitude: 39.0013395, longitude: -92.3128326 },
        ['restaurant'],
        ['breakfast_restaurant'],
        'POPULARITY',
        3_757,
      )
      expect(googleMaps.fetchGeocodeResults).toHaveBeenCalledWith('Columbia, MO 65203, USA')
      expect(JSON.parse(result.body)).toEqual(
        expect.objectContaining({
          ...newSession,
          sessionId: 'abc123',
        }),
      )
    })

    it('should include owner when JWT is present', async () => {
      jest.mocked(events).extractJwtFromEvent.mockReturnValueOnce(decodedJwt)
      const result = await postSessionHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.CREATED))
      expect(JSON.parse(result.body)).toEqual(
        expect.objectContaining({
          ...newSession,
          owner: 'efd31b67-19f2-4d0a-a723-78506ffc0b7e',
          sessionId: 'abc123',
        }),
      )
    })

    it('should set finished status when no data', async () => {
      jest.mocked(googleMaps).fetchPlaceResults.mockResolvedValueOnce([])
      const result = await postSessionHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.CREATED))
      expect(JSON.parse(result.body)).toEqual(
        expect.objectContaining({
          status: {
            current: 'finished',
          },
        }),
      )
    })
  })

  describe('postSessionHandlerUnauthenticated', () => {
    it('should return FORBIDDEN when getScoreFromEvent is under threshold', async () => {
      jest.mocked(recaptcha).getScoreFromEvent.mockResolvedValueOnce(0)
      const result = await postSessionHandlerUnauthenticated(event)
      expect(result).toEqual(status.FORBIDDEN)
    })

    it('should return INTERNAL_SERVER_ERROR when getScoreFromEvent rejects', async () => {
      jest.mocked(recaptcha).getScoreFromEvent.mockRejectedValueOnce(undefined)
      const result = await postSessionHandlerUnauthenticated(event)
      expect(result).toEqual(status.INTERNAL_SERVER_ERROR)
    })

    it('should return CREATED and body', async () => {
      const result = await postSessionHandlerUnauthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.CREATED))
      expect(googleMaps.fetchPlaceResults).toHaveBeenCalledWith(
        { latitude: 39.0013395, longitude: -92.3128326 },
        ['restaurant'],
        ['breakfast_restaurant'],
        'POPULARITY',
        3_757,
      )
      expect(JSON.parse(result.body)).toEqual(
        expect.objectContaining({
          ...newSession,
          sessionId: 'abc123',
        }),
      )
    })
  })
})
