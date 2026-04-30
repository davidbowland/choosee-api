import { geocodeResult, place1, place2, placeResponse, reverseGeocodeResult } from '../__mocks__'
import { fetchAddressFromGeocode, fetchGeocodeResults, fetchPlaceResults, HIDDEN_TYPES } from '@services/google-maps'
import { LatLng } from '@types'

const mockGeocode = jest.fn()
const mockReverseGeocode = jest.fn()
jest.mock('@googlemaps/google-maps-services-js', () => ({
  AddressType: { postal_code: 'postal_code', street_address: 'street_address' },
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

jest.mock('@utils/logging', () => ({ logWarn: jest.fn(), xrayCaptureHttps: jest.fn() }))

const fieldMask = {
  otherArgs: {
    headers: {
      'X-Goog-FieldMask':
        'places.id,places.types,places.nationalPhoneNumber,places.internationalPhoneNumber,places.formattedAddress,places.rating,places.websiteUri,places.currentOpeningHours,places.priceLevel,places.userRatingCount,places.priceLevel,places.displayName,places.editorialSummary,places.photos,places.generativeSummary,places.priceRange,places.utcOffsetMinutes',
    },
  },
}

describe('google-maps', () => {
  beforeAll(() => {
    mockGetPhotoMedia.mockResolvedValue([{ photoUri: 'a-picture-stream' }])
  })

  describe('fetchAddressFromGeocode', () => {
    beforeAll(() => {
      mockReverseGeocode.mockResolvedValue(reverseGeocodeResult)
    })

    it('should pass params to reverseGeocode', async () => {
      await fetchAddressFromGeocode(38.897957, -77.03656)
      expect(mockReverseGeocode).toHaveBeenCalledWith({
        params: {
          key: '98uhjgr4rgh0ijhgthjk',
          latlng: { lat: 38.897957, lng: -77.03656 },
          result_type: ['street_address', 'postal_code'],
        },
        timeout: 2500,
      })
    })

    it('should return results', async () => {
      const result = await fetchAddressFromGeocode(38.897957, -77.03656)
      expect(result).toEqual(reverseGeocodeResult)
    })
  })

  describe('fetchGeocodeResults', () => {
    beforeAll(() => {
      mockGeocode.mockResolvedValue(geocodeResult)
    })

    it('should pass address to geocode', async () => {
      await fetchGeocodeResults('90210')
      expect(mockGeocode).toHaveBeenCalledWith({
        params: { address: '90210', key: '98uhjgr4rgh0ijhgthjk' },
        timeout: 2500,
      })
    })

    it('should return results', async () => {
      const result = await fetchGeocodeResults('90210')
      expect(result).toEqual({
        address: 'Columbia, MO 65203, USA',
        latLng: { latitude: 39.0013395, longitude: -92.3128326 },
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

    beforeAll(() => {
      mockSearchNearby.mockResolvedValue([placeResponse])
    })

    it('should pass parameters to searchNearby with maxResultCount of 20', async () => {
      await fetchPlaceResults(location, primaryTypes, exclude, rankBy, radius)
      expect(mockSearchNearby).toHaveBeenCalledWith(
        {
          excludedTypes: expectedHiddenTypes,
          includedPrimaryTypes: primaryTypes,
          languageCode: 'en',
          locationRestriction: { circle: { center: location, radius } },
          maxResultCount: 20,
          rankPreference: rankBy,
        },
        fieldMask,
      )
    })

    it('should pass rankPreference for POPULARITY', async () => {
      await fetchPlaceResults(location, primaryTypes, exclude, 'POPULARITY', radius)
      expect(mockSearchNearby).toHaveBeenCalledWith(
        expect.objectContaining({ rankPreference: 'POPULARITY' }),
        fieldMask,
      )
    })

    it('should return results', async () => {
      const result = await fetchPlaceResults(location, primaryTypes, exclude, rankBy, radius)
      expect(result).toEqual([place1, place2])
    })

    it('should return an empty array when response has no places', async () => {
      mockSearchNearby.mockResolvedValueOnce([{}])
      const result = await fetchPlaceResults(location, primaryTypes, exclude, rankBy, radius)
      expect(result).toEqual([])
    })

    describe('ALL mode', () => {
      it('should make parallel POPULARITY and DISTANCE calls', async () => {
        mockSearchNearby.mockResolvedValue([placeResponse])

        await fetchPlaceResults(location, primaryTypes, exclude, 'ALL', radius)

        expect(mockSearchNearby).toHaveBeenCalledWith(
          expect.objectContaining({ rankPreference: 'POPULARITY' }),
          fieldMask,
        )
        expect(mockSearchNearby).toHaveBeenCalledWith(
          expect.objectContaining({ rankPreference: 'DISTANCE' }),
          fieldMask,
        )
      })

      it('should deduplicate results by placeId', async () => {
        // Both queries return the same two places
        mockSearchNearby.mockResolvedValue([placeResponse])

        const result = await fetchPlaceResults(location, primaryTypes, exclude, 'ALL', radius)

        const placeIds = result.map((p) => p.placeId)
        expect(placeIds).toEqual([...new Set(placeIds)])
        expect(result).toHaveLength(2)
      })

      it('should include unique places from both queries', async () => {
        const popularityResponse = {
          places: [placeResponse.places[0]],
        }
        const distanceResponse = {
          places: [placeResponse.places[1]],
        }
        mockSearchNearby.mockResolvedValueOnce([popularityResponse]).mockResolvedValueOnce([distanceResponse])

        const result = await fetchPlaceResults(location, primaryTypes, exclude, 'ALL', radius)

        expect(result).toHaveLength(2)
        expect(result[0].placeId).toBe(place1.placeId)
        expect(result[1].placeId).toBe(place2.placeId)
      })

      it('should continue with DISTANCE results when POPULARITY fails', async () => {
        mockSearchNearby.mockRejectedValueOnce(new Error('POPULARITY failed')).mockResolvedValueOnce([placeResponse])

        const result = await fetchPlaceResults(location, primaryTypes, exclude, 'ALL', radius)

        expect(result).toHaveLength(2)
      })

      it('should continue with POPULARITY results when DISTANCE fails', async () => {
        mockSearchNearby.mockResolvedValueOnce([placeResponse]).mockRejectedValueOnce(new Error('DISTANCE failed'))

        const result = await fetchPlaceResults(location, primaryTypes, exclude, 'ALL', radius)

        expect(result).toHaveLength(2)
      })

      it('should throw when both queries fail', async () => {
        mockSearchNearby
          .mockRejectedValueOnce(new Error('POPULARITY failed'))
          .mockRejectedValueOnce(new Error('DISTANCE failed'))

        await expect(fetchPlaceResults(location, primaryTypes, exclude, 'ALL', radius)).rejects.toThrow(
          'POPULARITY failed',
        )
      })
    })

    describe('photo resilience', () => {
      beforeEach(() => {
        mockGetPhotoMedia.mockReset()
      })

      afterEach(() => {
        // Restore default for other tests
        mockGetPhotoMedia.mockResolvedValue([{ photoUri: 'a-picture-stream' }])
      })

      it('should skip failed photos and return successful ones', async () => {
        mockSearchNearby.mockResolvedValueOnce([placeResponse])
        mockGetPhotoMedia
          .mockResolvedValueOnce([{ photoUri: 'photo-1' }])
          .mockRejectedValueOnce(new Error('photo fetch failed'))
          .mockResolvedValueOnce([{ photoUri: 'photo-3' }])
          .mockResolvedValueOnce([{ photoUri: 'photo-4' }])
          .mockResolvedValueOnce([{ photoUri: 'photo-5' }])
          .mockResolvedValueOnce([{ photoUri: 'photo-6' }])
          .mockResolvedValueOnce([{ photoUri: 'photo-7' }])
          .mockResolvedValueOnce([{ photoUri: 'photo-8' }])
          .mockResolvedValueOnce([{ photoUri: 'photo-9' }])
          .mockResolvedValueOnce([{ photoUri: 'photo-10' }])

        const result = await fetchPlaceResults(location, primaryTypes, exclude, rankBy, radius)

        // place1 has 10 photos in placeResponse but googleImageCount limits to 5
        // One of those 5 fails, so place1 should have 4 photos
        expect(result[0].photos).toHaveLength(4)
      })

      it('should return empty photos array when all photos fail for a place', async () => {
        const singlePlaceResponse = { places: [{ ...placeResponse.places[1], photos: [{ name: 'bad-photo' }] }] }
        mockSearchNearby.mockResolvedValueOnce([singlePlaceResponse])
        mockGetPhotoMedia.mockRejectedValueOnce(new Error('photo fetch failed'))

        const result = await fetchPlaceResults(location, primaryTypes, exclude, rankBy, radius)

        expect(result[0].photos).toEqual([])
      })
    })
  })
})
