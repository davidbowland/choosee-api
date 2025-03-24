import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import * as events from '@utils/events'
import * as googleMaps from '@services/google-maps'
import * as idGenerator from '@utils/id-generator'
import * as recaptcha from '@services/recaptcha'
import { decodedJwt, geocodedAddress, newSession, place1, sessionId } from '../__mocks__'
import { postSessionHandlerAuthenticated, postSessionHandlerUnauthenticated } from '@handlers/post-session'
import { APIGatewayProxyEventV2 } from '@types'
import eventJson from '@events/post-session.json'
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
    mocked(events).extractJwtFromEvent.mockReturnValue(null)
    mocked(events).extractNewSessionFromEvent.mockReturnValue(newSession)
    mocked(googleMaps).fetchGeocodeResults.mockResolvedValue(geocodedAddress)
    mocked(googleMaps).fetchPlaceResults.mockResolvedValue([place1])
    mocked(idGenerator).getNextId.mockResolvedValue(sessionId)
    mocked(recaptcha).getScoreFromEvent.mockResolvedValue(1)
  })

  describe('postSessionHandlerAuthenticated', () => {
    test('expect BAD_REQUEST when new session is invalid', async () => {
      mocked(events).extractNewSessionFromEvent.mockImplementationOnce(() => {
        throw new Error('Bad request')
      })
      const result = await postSessionHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.BAD_REQUEST))
    })

    test('expect INTERNAL_SERVER_ERROR when fetchPlaceResults rejects from geocode', async () => {
      mocked(googleMaps).fetchPlaceResults.mockRejectedValueOnce({
        response: { data: { message: 'Invalid address' }, status: status.BAD_REQUEST.statusCode },
      })
      const result = await postSessionHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect sessionId passed to setSessionById', async () => {
      await postSessionHandlerAuthenticated(event)
      expect(mocked(dynamodb).setSessionById).toHaveBeenCalledWith('abc123', expect.objectContaining(newSession))
    })

    test('expect INTERNAL_SERVER_ERROR on setSessionById reject', async () => {
      mocked(dynamodb).setSessionById.mockRejectedValueOnce(undefined)
      const result = await postSessionHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect fetchGeocodeResults not called when latitude and longitude are passed', async () => {
      const sessionWithLatLong = { ...newSession, latitude: 39.0013395, longitude: -92.3128326 }
      mocked(events).extractNewSessionFromEvent.mockReturnValueOnce(sessionWithLatLong)
      await postSessionHandlerAuthenticated(event)
      expect(mocked(googleMaps).fetchGeocodeResults).not.toHaveBeenCalled()
    })

    test('expect CREATED and body', async () => {
      const result = await postSessionHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.CREATED))
      expect(mocked(googleMaps).fetchPlaceResults).toHaveBeenCalledWith(
        { latitude: 39.0013395, longitude: -92.3128326 },
        ['restaurant'],
        'POPULARITY',
        3_757,
      )
      expect(mocked(googleMaps).fetchGeocodeResults).toHaveBeenCalledWith('Columbia, MO 65203, USA')
      expect(JSON.parse(result.body)).toEqual(
        expect.objectContaining({
          ...newSession,
          sessionId: 'abc123',
        }),
      )
    })

    test('expect owner when JWT', async () => {
      mocked(events).extractJwtFromEvent.mockReturnValueOnce(decodedJwt)
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

    test('expect finished status when no data', async () => {
      mocked(googleMaps).fetchPlaceResults.mockResolvedValueOnce([])
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
    test('expect FORBIDDEN when getScoreFromEvent is under threshold', async () => {
      mocked(recaptcha).getScoreFromEvent.mockResolvedValueOnce(0)
      const result = await postSessionHandlerUnauthenticated(event)
      expect(result).toEqual(status.FORBIDDEN)
    })

    test('expect INTERNAL_SERVER_ERROR when getScoreFromEvent rejects', async () => {
      mocked(recaptcha).getScoreFromEvent.mockRejectedValueOnce(undefined)
      const result = await postSessionHandlerUnauthenticated(event)
      expect(result).toEqual(status.INTERNAL_SERVER_ERROR)
    })

    test('expect CREATED and body', async () => {
      const result = await postSessionHandlerUnauthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.CREATED))
      expect(mocked(googleMaps).fetchPlaceResults).toHaveBeenCalledWith(
        { latitude: 39.0013395, longitude: -92.3128326 },
        ['restaurant'],
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
