import { AddressType, Client as GeocodeClient, ReverseGeocodeResponse } from '@googlemaps/google-maps-services-js'
import { PlacesClient } from '@googlemaps/places'

import { GeocodedAddress, LatLng, PlaceDetails, PriceLevel, RankByType } from '../types'
import { googleApiKey, googleImageCount, googleImageMaxHeight, googleImageMaxWidth, googleTimeoutMs } from '../config'
import { xrayCaptureHttps } from '../utils/logging'

export const HIDDEN_TYPES = [
  'airport',
  'bowling_alley',
  'casino',
  'convenience_store',
  'funeral_home',
  'gas_station',
  'gym',
  'zoo',
]

xrayCaptureHttps()
const geocodeClient = new GeocodeClient()
const placesClient = new PlacesClient({
  apiKey: googleApiKey,
  timeout: googleTimeoutMs,
})

/* Geocoding */

export const fetchAddressFromGeocode = async (latitude: number, longitude: number): Promise<ReverseGeocodeResponse> => {
  const result = await geocodeClient.reverseGeocode({
    params: {
      key: googleApiKey,
      latlng: {
        lat: latitude,
        lng: longitude,
      },
      result_type: [AddressType.street_address, AddressType.postal_code],
    },
    timeout: googleTimeoutMs,
  })
  return result
}

export const fetchGeocodeResults = async (address: string): Promise<GeocodedAddress> => {
  const result = await geocodeClient.geocode({
    params: {
      address,
      key: googleApiKey,
    },
    timeout: googleTimeoutMs,
  })

  const location = result.data.results[0].geometry.location
  return {
    address: result.data.results[0].formatted_address,
    latLng: { latitude: location.lat, longitude: location.lng },
  }
}

/* Place photos */

const fetchPicture = async (name: string): Promise<string> => {
  const response = await placesClient.getPhotoMedia({
    maxHeightPx: googleImageMaxHeight,
    maxWidthPx: googleImageMaxWidth,
    name,
  })
  return response[0].photoUri as string
}

/* Nearby search */

export const fetchPlaceResults = async (
  location: LatLng,
  types: string[], // e.g. ['restaurant']
  rankBy: RankByType,
  radius: number,
): Promise<PlaceDetails[]> => {
  const response = await placesClient.searchNearby(
    {
      excludedTypes: HIDDEN_TYPES,
      includedPrimaryTypes: types,
      languageCode: 'en',
      locationRestriction: {
        circle: {
          center: location,
          radius: radius,
        },
      },
      rankPreference: rankBy,
    },
    {
      otherArgs: {
        headers: {
          'X-Goog-FieldMask':
            'places.id,places.types,places.nationalPhoneNumber,places.internationalPhoneNumber,places.formattedAddress,places.rating,places.websiteUri,places.currentOpeningHours,places.priceLevel,places.userRatingCount,places.priceLevel,places.displayName,places.editorialSummary,places.photos,places.generativeSummary,places.priceRange',
        },
      },
    },
  )
  return await Promise.all(
    response[0].places?.map(async (place) => ({
      formattedAddress: place.formattedAddress,
      formattedPhoneNumber: place.nationalPhoneNumber,
      internationalPhoneNumber: place.internationalPhoneNumber,
      name: place.displayName?.text,
      openHours: place.currentOpeningHours?.weekdayDescriptions,
      photos: await Promise.all(
        place.photos?.slice(0, googleImageCount).map((photo) => fetchPicture(`${photo.name}/media`)) ?? [],
      ),
      placeId: place.id as string,
      priceLevel: place.priceLevel as PriceLevel,
      rating: place.rating,
      ratingsTotal: place.userRatingCount,
      website: place.websiteUri,
    })) ?? [],
  )
}
