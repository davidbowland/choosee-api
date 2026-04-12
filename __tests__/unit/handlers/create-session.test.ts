import { geocodedAddress, place1, place2, session, sessionId } from '../__mocks__'
import { handler } from '@handlers/create-session'
import * as brackets from '@services/brackets'
import * as dynamodb from '@services/dynamodb'
import * as googleMaps from '@services/google-maps'

jest.mock('@services/dynamodb')
jest.mock('@services/google-maps')
jest.mock('@services/brackets')
jest.mock('@utils/logging', () => ({
  log: jest.fn(),
  logError: jest.fn(),
  xrayCapture: jest.fn((x: unknown) => x),
  xrayCaptureHttps: jest.fn(),
}))

describe('create-session', () => {
  const createEvent = {
    sessionId,
    address: 'Columbia, MO 65203, USA',
    type: ['restaurant'],
    exclude: ['breakfast_restaurant'],
    radius: 3757,
    rankBy: 'POPULARITY' as const,
  }

  beforeAll(() => {
    jest.mocked(dynamodb).getSession.mockResolvedValue({ session, users: [], version: 0 })
    jest.mocked(dynamodb).putSession.mockResolvedValue(undefined)
    jest.mocked(dynamodb).putChoices.mockResolvedValue(undefined)
    jest.mocked(googleMaps).fetchPlaceResults.mockResolvedValue([place1, place2])
    jest.mocked(googleMaps).fetchGeocodeResults.mockResolvedValue(geocodedAddress)
    jest.mocked(brackets).generateMatchups.mockReturnValue({
      matchups: [['choice-1', 'choice-2']],
      bye: null,
    })
  })

  describe('handler', () => {
    it('should fetch restaurants and create choices record on success', async () => {
      await handler(createEvent)

      expect(googleMaps.fetchPlaceResults).toHaveBeenCalled()
      expect(dynamodb.putChoices).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          choices: expect.objectContaining({
            'choice-1': expect.objectContaining({ choiceId: 'choice-1', name: place1.name }),
            'choice-2': expect.objectContaining({ choiceId: 'choice-2', name: place2.name }),
          }),
          expiration: session.expiration,
        }),
      )
    })

    it('should build bracket matchups via generateMatchups', async () => {
      await handler(createEvent)

      expect(brackets.generateMatchups).toHaveBeenCalledWith(['choice-1', 'choice-2'])
    })

    it('should update session with isReady: true and timeoutAt: undefined', async () => {
      await handler(createEvent)

      expect(dynamodb.putSession).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          bracket: [[['choice-1', 'choice-2']]],
          byes: [null],
          isReady: true,
          timeoutAt: undefined,
          totalRounds: 1,
        }),
      )
    })

    it('should geocode address when latitude/longitude not provided', async () => {
      await handler(createEvent)

      expect(googleMaps.fetchGeocodeResults).toHaveBeenCalledWith(createEvent.address)
    })

    it('should skip geocoding when latitude/longitude are provided', async () => {
      const eventWithCoords = { ...createEvent, latitude: 38.95, longitude: -92.37 }
      await handler(eventWithCoords)

      expect(googleMaps.fetchGeocodeResults).not.toHaveBeenCalled()
      expect(googleMaps.fetchPlaceResults).toHaveBeenCalledWith(
        { latitude: 38.95, longitude: -92.37 },
        createEvent.type,
        createEvent.exclude,
        createEvent.rankBy,
        createEvent.radius,
      )
    })

    it('should set errorMessage when fewer than 2 restaurants found', async () => {
      jest.mocked(googleMaps).fetchPlaceResults.mockResolvedValueOnce([place1])

      await handler(createEvent)

      expect(dynamodb.putSession).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          errorMessage: expect.stringContaining('Not enough restaurants'),
        }),
      )
    })

    it('should set errorMessage when Google Places API fails', async () => {
      jest.mocked(googleMaps).fetchPlaceResults.mockRejectedValueOnce(new Error('API error'))

      await handler(createEvent)

      expect(dynamodb.putSession).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          errorMessage: expect.stringContaining('Failed to fetch restaurants'),
        }),
      )
    })

    it('should set errorMessage when geocoding fails', async () => {
      jest.mocked(googleMaps).fetchGeocodeResults.mockRejectedValueOnce(new Error('Geocode error'))

      await handler(createEvent)

      expect(dynamodb.putSession).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          errorMessage: expect.stringContaining('Could not resolve address'),
        }),
      )
    })

    it('should set errorMessage on unexpected errors', async () => {
      // First getSession call (in main flow) fails, second call (in setErrorMessage) succeeds via default mock
      jest.mocked(dynamodb).getSession.mockRejectedValueOnce(new Error('DynamoDB error'))

      await handler(createEvent)

      expect(dynamodb.putSession).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          errorMessage: expect.stringContaining('Failed to fetch restaurants'),
        }),
      )
    })

    it('should silently swallow errors when setErrorMessage itself fails', async () => {
      // Both getSession calls fail — main flow and error handler
      jest
        .mocked(dynamodb)
        .getSession.mockRejectedValueOnce(new Error('DynamoDB down'))
        .mockRejectedValueOnce(new Error('DynamoDB down'))

      await expect(handler(createEvent)).resolves.toBeUndefined()
    })
  })
})
