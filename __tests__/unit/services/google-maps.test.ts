import { geocodeResult, place1, place2, placeResponse, reverseGeocodeResult } from '../__mocks__'
import { fetchAddressFromGeocode, fetchGeocodeResults, fetchPlaceResults, HIDDEN_TYPES } from '@services/google-maps'
import { LatLng } from '@types'

const mockGeocode = jest.fn()
const mockReverseGeocode = jest.fn()
jest.mock('@googlemaps/google-maps-services-js', () => ({
  AddressType: {
    postal_code: 'postal_code',
    street_address: 'street_address',
  },
  Client: jest.fn().mockReturnValue({
    geocode: (...args) => mockGeocode(...args),
    reverseGeocode: (...args) => mockReverseGeocode(...args),
  }),
}))

const mockGetPhotoMedia = jest.fn()
const mockSearchNearby = jest.fn()
jest.mock('@googlemaps/places', () => ({
  PlacesClient: jest.fn().mockReturnValue({
    getPhotoMedia: (...args) => mockGetPhotoMedia(...args),
    searchNearby: (...args) => mockSearchNearby(...args),
  }),
}))

jest.mock('@utils/logging', () => ({
  xrayCaptureHttps: jest.fn(),
}))

describe('google-maps', () => {
  const photoUri = 'a-picture-stream'

  beforeAll(() => {
    mockGetPhotoMedia.mockResolvedValue([{ photoUri }])
  })

  describe('fetchAddressFromGeocode', () => {
    const latitude = 38.897957
    const longitude = -77.03656

    beforeAll(() => {
      mockReverseGeocode.mockResolvedValue(reverseGeocodeResult)
    })

    it('should pass address to geocode', async () => {
      await fetchAddressFromGeocode(latitude, longitude)
      expect(mockReverseGeocode).toHaveBeenCalledWith({
        params: {
          key: '98uhjgr4rgh0ijhgthjk',
          latlng: {
            lat: 38.897957,
            lng: -77.03656,
          },
          result_type: ['street_address', 'postal_code'],
        },
        timeout: 2500,
      })
    })

    it('should return results', async () => {
      const result = await fetchAddressFromGeocode(latitude, longitude)
      expect(result).toEqual(reverseGeocodeResult)
    })
  })

  describe('fetchGeocodeResults', () => {
    const address = '90210'

    beforeAll(() => {
      mockGeocode.mockResolvedValue(geocodeResult)
    })

    it('should pass address to geocode', async () => {
      await fetchGeocodeResults(address)
      expect(mockGeocode).toHaveBeenCalledWith({
        params: {
          address,
          key: '98uhjgr4rgh0ijhgthjk',
        },
        timeout: 2500,
      })
    })

    it('should return results', async () => {
      const result = await fetchGeocodeResults(address)
      expect(result).toEqual({
        address: 'Columbia, MO 65203, USA',
        latLng: {
          latitude: 39.0013395,
          longitude: -92.3128326,
        },
      })
    })
  })

  describe('fetchPlaceResults', () => {
    const location: LatLng = { latitude: 39, longitude: -92 }
    const radius = 45_000
    const rankBy = 'DISTANCE'

    const primaryTypes = ['restaurant']
    const exclude = ['cat_cafe', 'fast_food_restaurant']
    const expectedHiddenTypes = HIDDEN_TYPES.concat(exclude)

    const otherArgs = {
      otherArgs: {
        headers: {
          'X-Goog-FieldMask':
            'places.id,places.types,places.nationalPhoneNumber,places.internationalPhoneNumber,places.formattedAddress,places.rating,places.websiteUri,places.currentOpeningHours,places.priceLevel,places.userRatingCount,places.priceLevel,places.displayName,places.editorialSummary,places.photos,places.generativeSummary,places.priceRange',
        },
      },
    }

    beforeAll(() => {
      mockSearchNearby.mockResolvedValue([placeResponse])
    })

    it('should pass parameters to placesNearby', async () => {
      await fetchPlaceResults(location, primaryTypes, exclude, rankBy, radius)
      expect(mockSearchNearby).toHaveBeenCalledWith(
        {
          excludedTypes: expectedHiddenTypes,
          includedPrimaryTypes: primaryTypes,
          languageCode: 'en',
          locationRestriction: {
            circle: {
              center: location,
              radius,
            },
          },
          rankPreference: rankBy,
        },
        otherArgs,
      )
    })

    it('should pass radius when rank by prominence', async () => {
      await fetchPlaceResults(location, primaryTypes, exclude, 'POPULARITY', radius)
      expect(mockSearchNearby).toHaveBeenCalledWith(
        {
          excludedTypes: expectedHiddenTypes,
          includedPrimaryTypes: primaryTypes,
          languageCode: 'en',
          locationRestriction: {
            circle: {
              center: location,
              radius,
            },
          },
          rankPreference: 'POPULARITY',
        },
        otherArgs,
      )
    })

    it('should return results', async () => {
      const result = await fetchPlaceResults(location, primaryTypes, exclude, rankBy, radius)
      expect(result).toEqual([place1, place2])
    })

    it('should return an empty array when response is undefined', async () => {
      mockSearchNearby.mockResolvedValueOnce([{}])
      const result = await fetchPlaceResults(location, primaryTypes, exclude, rankBy, radius)
      expect(result).toEqual([])
    })
  })
})
