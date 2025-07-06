import { reverseGeocodeResult } from '../__mocks__'
import eventJson from '@events/get-reverse-geocode.json'
import {
  getReverseGeocodeHandlerAuthenticated,
  getReverseGeocodeHandlerUnauthenticated,
} from '@handlers/get-reverse-geocode'
import * as googleMaps from '@services/google-maps'
import * as recaptcha from '@services/recaptcha'
import { APIGatewayProxyEventV2 } from '@types'
import * as events from '@utils/events'
import status from '@utils/status'

jest.mock('@services/google-maps')
jest.mock('@services/recaptcha')
jest.mock('@utils/events')
jest.mock('@utils/logging')

describe('get-reverse-geocode', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    jest.mocked(events).extractLatLngFromEvent.mockReturnValue({ latitude: 38.897957, longitude: -77.03656 })
    jest.mocked(googleMaps).fetchAddressFromGeocode.mockResolvedValue({ data: reverseGeocodeResult } as any)
    jest.mocked(recaptcha).getScoreFromEvent.mockResolvedValue(1)
  })

  describe('getReverseGeocodeHandlerAuthenticated', () => {
    it('should return INTERNAL_SERVER_ERROR when fetchAddressFromGeocode rejects', async () => {
      jest.mocked(googleMaps).fetchAddressFromGeocode.mockRejectedValueOnce(undefined)
      const result = await getReverseGeocodeHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    it('should return NOT_FOUND when no geocode results are found', async () => {
      jest.mocked(googleMaps).fetchAddressFromGeocode.mockResolvedValueOnce({ data: { results: [] } } as any)
      const result = await getReverseGeocodeHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.NOT_FOUND))
    })

    it('should return BAD_REQUEST when latitude and longitude parameters are missing', async () => {
      jest.mocked(events).extractLatLngFromEvent.mockImplementationOnce(() => {
        throw new Error(JSON.stringify({ message: 'latitude and longitude query parameters must be provided' }))
      })
      const result = await getReverseGeocodeHandlerAuthenticated(event)
      expect(result).toEqual({
        ...status.BAD_REQUEST,
        body: '{"message":"latitude and longitude query parameters must be provided"}',
      })
    })

    it('should return OK with address when coordinates are valid', async () => {
      const result = await getReverseGeocodeHandlerAuthenticated(event)
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify({ address: '1600 Pennsylvania Avenue NW, Washington, DC 20500, USA' }),
      })
    })
  })

  describe('getReverseGeocodeHandlerUnauthenticated', () => {
    it('should return FORBIDDEN when reCAPTCHA score is below threshold', async () => {
      jest.mocked(recaptcha).getScoreFromEvent.mockResolvedValueOnce(0)
      const result = await getReverseGeocodeHandlerUnauthenticated(event)
      expect(result).toEqual(status.FORBIDDEN)
    })

    it('should return INTERNAL_SERVER_ERROR when reCAPTCHA verification fails', async () => {
      jest.mocked(recaptcha).getScoreFromEvent.mockRejectedValueOnce(undefined)
      const result = await getReverseGeocodeHandlerUnauthenticated(event)
      expect(result).toEqual(status.INTERNAL_SERVER_ERROR)
    })

    it('should return OK with address when reCAPTCHA score is valid', async () => {
      const result = await getReverseGeocodeHandlerUnauthenticated(event)
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify({ address: '1600 Pennsylvania Avenue NW, Washington, DC 20500, USA' }),
      })
    })
  })
})
