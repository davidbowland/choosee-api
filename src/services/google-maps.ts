import { AddressType, Client as GeocodeClient, ReverseGeocodeResponse } from '@googlemaps/google-maps-services-js'
import { PlacesClient } from '@googlemaps/places'

import { googleApiKey, googleImageCount, googleImageMaxHeight, googleImageMaxWidth, googleTimeoutMs } from '../config'
import { GeocodedAddress, GoogleRankBy, LatLng, PlaceDetails, PriceLevel, RankByType } from '../types'
import { logWarn, xrayCaptureHttps } from '../utils/logging'

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

const searchNearbyFieldMask = {
  otherArgs: {
    headers: {
      'X-Goog-FieldMask':
        'places.id,places.types,places.nationalPhoneNumber,places.internationalPhoneNumber,places.formattedAddress,places.rating,places.websiteUri,places.currentOpeningHours,places.priceLevel,places.userRatingCount,places.priceLevel,places.displayName,places.editorialSummary,places.photos,places.generativeSummary,places.priceRange',
    },
  },
}

interface GooglePlace {
  id?: string | null
  formattedAddress?: string | null
  nationalPhoneNumber?: string | null
  internationalPhoneNumber?: string | null
  displayName?: { text?: string | null } | null
  currentOpeningHours?: { weekdayDescriptions?: string[] | null } | null
  photos?: { name?: string | null }[] | null
  priceLevel?: string | null
  rating?: number | null
  types?: string[] | null
  userRatingCount?: number | null
  websiteUri?: string | null
}

/** Intermediate shape: PlaceDetails without resolved photos, carrying raw photo refs instead. */
interface RawPlaceWithRefs extends Omit<PlaceDetails, 'photos'> {
  photoRefs: string[]
}

/** Map a GooglePlace to RawPlaceWithRefs (no photo fetching). */
const toRawPlace = (place: GooglePlace): RawPlaceWithRefs => ({
  formattedAddress: place.formattedAddress,
  formattedPhoneNumber: place.nationalPhoneNumber,
  internationalPhoneNumber: place.internationalPhoneNumber,
  name: place.displayName?.text,
  openHours: place.currentOpeningHours?.weekdayDescriptions,
  photoRefs: place.photos?.slice(0, googleImageCount).map((p) => `${p.name}/media`) ?? [],
  placeId: place.id as string,
  priceLevel: place.priceLevel as PriceLevel,
  rating: place.rating,
  ratingsTotal: place.userRatingCount,
  placeTypes: place.types,
  website: place.websiteUri,
})

const PHOTO_CONCURRENCY = 5

// The new Places API (v1) searchNearby returns at most 20 results per call
// and has no page token mechanism.
const MAX_RESULTS_PER_REQUEST = 20

/** Single-strategy search: calls Google Places API once with the given rankPreference. */
const searchNearby = async (
  location: LatLng,
  types: string[],
  exclude: string[],
  rankBy: GoogleRankBy,
  radius: number,
): Promise<GooglePlace[]> => {
  const response = await placesClient.searchNearby(
    {
      excludedTypes: HIDDEN_TYPES.concat(exclude),
      includedPrimaryTypes: types,
      languageCode: 'en',
      locationRestriction: {
        circle: {
          center: location,
          radius,
        },
      },
      maxResultCount: MAX_RESULTS_PER_REQUEST,
      rankPreference: rankBy,
    },
    searchNearbyFieldMask,
  )
  return (response[0].places ?? []) as GooglePlace[]
}

/** Deduplicate places by placeId, keeping the first occurrence. */
const dedupeByPlaceId = <T extends { placeId: string }>(places: T[]): T[] => {
  const seen = new Set<string>()
  return places.filter((p) => {
    if (seen.has(p.placeId)) return false
    seen.add(p.placeId)
    return true
  })
}

/**
 * Fetch place results for any RankByType.
 *
 * - DISTANCE / POPULARITY: single API call.
 * - ALL: parallel POPULARITY + DISTANCE calls, deduplicated by placeId
 *   (popularity results first). If one query fails, the other's results are used.
 *
 * Photos are fetched with bounded concurrency (max 5 at a time).
 * Individual photo failures are logged and result in an empty string being omitted.
 */
export const fetchPlaceResults = async (
  location: LatLng,
  types: string[],
  exclude: string[],
  rankBy: RankByType,
  radius: number,
): Promise<PlaceDetails[]> => {
  let rawPlaces: GooglePlace[]

  if (rankBy === 'ALL') {
    const results = await Promise.allSettled([
      searchNearby(location, types, exclude, 'POPULARITY', radius),
      searchNearby(location, types, exclude, 'DISTANCE', radius),
    ])

    const popularityPlaces = results[0].status === 'fulfilled' ? results[0].value : []
    const distancePlaces = results[1].status === 'fulfilled' ? results[1].value : []

    if (results[0].status === 'rejected') {
      logWarn('POPULARITY search failed in ALL mode, continuing with DISTANCE results', results[0].reason)
    }
    if (results[1].status === 'rejected') {
      logWarn('DISTANCE search failed in ALL mode, continuing with POPULARITY results', results[1].reason)
    }
    if (results[0].status === 'rejected' && results[1].status === 'rejected') {
      throw results[0].reason
    }

    rawPlaces = [...popularityPlaces, ...distancePlaces]
  } else {
    rawPlaces = await searchNearby(location, types, exclude, rankBy, radius)
  }

  const mapped = rawPlaces.map(toRawPlace)
  const unique = dedupeByPlaceId(mapped)

  // Collect all photo refs with back-references, then resolve in batches
  const allRefs: { placeIdx: number; ref: string }[] = []
  for (let i = 0; i < unique.length; i++) {
    for (const ref of unique[i].photoRefs) {
      allRefs.push({ placeIdx: i, ref })
    }
  }

  const photosByPlace: string[][] = unique.map(() => [])
  for (let i = 0; i < allRefs.length; i += PHOTO_CONCURRENCY) {
    const batch = allRefs.slice(i, i + PHOTO_CONCURRENCY)
    const settled = await Promise.allSettled(batch.map((entry) => fetchPicture(entry.ref)))
    settled.forEach((result, j) => {
      if (result.status === 'fulfilled') {
        photosByPlace[batch[j].placeIdx].push(result.value)
      } else {
        logWarn('Failed to fetch photo, skipping', batch[j].ref, result.reason)
      }
    })
  }

  return unique.map((place, i) => ({
    formattedAddress: place.formattedAddress,
    formattedPhoneNumber: place.formattedPhoneNumber,
    internationalPhoneNumber: place.internationalPhoneNumber,
    name: place.name,
    openHours: place.openHours,
    photos: photosByPlace[i],
    placeId: place.placeId,
    priceLevel: place.priceLevel,
    rating: place.rating,
    ratingsTotal: place.ratingsTotal,
    placeTypes: place.placeTypes,
    website: place.website,
  }))
}
