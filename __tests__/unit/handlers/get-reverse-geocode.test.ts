import { mocked } from 'jest-mock'

import * as events from '@utils/events'
import * as googleMaps from '@services/google-maps'
import * as recaptcha from '@services/recaptcha'
import {
  getReverseGeocodeHandlerAuthenticated,
  getReverseGeocodeHandlerUnauthenticated,
} from '@handlers/get-reverse-geocode'
import { APIGatewayProxyEventV2 } from '@types'
import eventJson from '@events/get-reverse-geocode.json'
import { reverseGeocodeResult } from '../__mocks__'
import status from '@utils/status'

jest.mock('@services/google-maps')
jest.mock('@services/recaptcha')
jest.mock('@utils/events')
jest.mock('@utils/logging')

describe('get-reverse-geocode', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    mocked(events).extractLatLngFromEvent.mockReturnValue({ latitude: 38.897957, longitude: -77.03656 })
    mocked(googleMaps).fetchAddressFromGeocode.mockResolvedValue({ data: reverseGeocodeResult } as any)
    mocked(recaptcha).getScoreFromEvent.mockResolvedValue(1)
  })

  describe('getReverseGeocodeHandlerAuthenticated', () => {
    test('expect INTERNAL_SERVER_ERROR on fetchAddressFromGeocode reject', async () => {
      mocked(googleMaps).fetchAddressFromGeocode.mockRejectedValueOnce(undefined)
      const result = await getReverseGeocodeHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect NOT_FOUND on getReverseGeocodeHandlerAuthenticated reject', async () => {
      mocked(googleMaps).fetchAddressFromGeocode.mockResolvedValueOnce({ data: { results: [] } } as any)
      const result = await getReverseGeocodeHandlerAuthenticated(event)
      expect(result).toEqual(expect.objectContaining(status.NOT_FOUND))
    })

    test('expect BAD_REQUEST when query parameters missing', async () => {
      mocked(events).extractLatLngFromEvent.mockImplementationOnce(() => {
        throw new Error(JSON.stringify({ message: 'latitude and longitude query parameters must be provided' }))
      })
      const result = await getReverseGeocodeHandlerAuthenticated(event)
      expect(result).toEqual({
        ...status.BAD_REQUEST,
        body: '{"message":"latitude and longitude query parameters must be provided"}',
      })
    })

    test('expect OK when id exists', async () => {
      const result = await getReverseGeocodeHandlerAuthenticated(event)
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify({ address: '1600 Pennsylvania Avenue NW, Washington, DC 20500, USA' }),
      })
    })
  })

  describe('getReverseGeocodeHandlerUnauthenticated', () => {
    test('expect FORBIDDEN when getScoreFromEvent is under threshold', async () => {
      mocked(recaptcha).getScoreFromEvent.mockResolvedValueOnce(0)
      const result = await getReverseGeocodeHandlerUnauthenticated(event)
      expect(result).toEqual(status.FORBIDDEN)
    })

    test('expect INTERNAL_SERVER_ERROR when getScoreFromEvent rejects', async () => {
      mocked(recaptcha).getScoreFromEvent.mockRejectedValueOnce(undefined)
      const result = await getReverseGeocodeHandlerUnauthenticated(event)
      expect(result).toEqual(status.INTERNAL_SERVER_ERROR)
    })

    test('expect OK when id exists', async () => {
      const result = await getReverseGeocodeHandlerUnauthenticated(event)
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify({ address: '1600 Pennsylvania Avenue NW, Washington, DC 20500, USA' }),
      })
    })
  })
})
