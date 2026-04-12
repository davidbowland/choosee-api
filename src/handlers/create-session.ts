import placeTypes from '../assets/place-types'
import { generateMatchups } from '../services/brackets'
import { getSession, putChoices, putSession } from '../services/dynamodb'
import { fetchGeocodeResults, fetchPlaceResults } from '../services/google-maps'
import { ChoiceDetail, ChoicesRecord, LatLng, PlaceDetails, RankByType } from '../types'
import { log, logError } from '../utils/logging'

const placeTypeDisplayMap = new Map(
  placeTypes.filter((pt) => pt.value !== 'restaurant').map((pt) => [pt.value, pt.display]),
)

interface CreateSessionEvent {
  sessionId: string
  address: string
  type: string[]
  exclude: string[]
  radius: number
  rankBy: RankByType
  latitude?: number
  longitude?: number
}

const toChoiceDetail = (place: PlaceDetails, choiceId: string): ChoiceDetail => {
  const detail: ChoiceDetail = {
    choiceId,
    name: place.name ?? '',
    photos: place.photos,
    placeTypes: (place.placeTypes ?? [])
      .map((t) => placeTypeDisplayMap.get(t))
      .filter((d): d is string => d !== undefined),
  }
  if (place.formattedAddress != null) detail.formattedAddress = place.formattedAddress
  if (place.formattedPhoneNumber != null) detail.formattedPhoneNumber = place.formattedPhoneNumber
  if (place.internationalPhoneNumber != null) detail.internationalPhoneNumber = place.internationalPhoneNumber
  if (place.priceLevel != null) detail.priceLevel = place.priceLevel
  if (place.rating != null) detail.rating = place.rating
  if (place.ratingsTotal != null) detail.ratingsTotal = place.ratingsTotal
  if (place.openHours != null) detail.openHours = place.openHours
  if (place.website != null) detail.website = place.website
  return detail
}

const setErrorMessage = async (sessionId: string, message: string): Promise<void> => {
  try {
    const { session } = await getSession(sessionId)
    await putSession(sessionId, { ...session, errorMessage: message })
  } catch (err) {
    logError('Failed to write error message to session', err)
  }
}

export const handler = async (event: CreateSessionEvent): Promise<void> => {
  log('Create session invoked', { sessionId: event.sessionId })
  try {
    let location: LatLng
    if (event.latitude !== undefined && event.longitude !== undefined) {
      location = { latitude: event.latitude, longitude: event.longitude }
    } else {
      try {
        const geocoded = await fetchGeocodeResults(event.address)
        location = geocoded.latLng
      } catch (err) {
        logError('Geocoding failed', err)
        await setErrorMessage(event.sessionId, 'Could not resolve address. Please check and try again.')
        return
      }
    }

    let places: PlaceDetails[]
    try {
      places = await fetchPlaceResults(location, event.type, event.exclude, event.rankBy, event.radius)
    } catch (err) {
      logError('Google Places API failed', err)
      await setErrorMessage(event.sessionId, 'Failed to fetch restaurants. Please try again.')
      return
    }

    if (places.length < 2) {
      await setErrorMessage(
        event.sessionId,
        'Not enough restaurants found. Try a different location or broader search criteria.',
      )
      return
    }

    const choices: Record<string, ChoiceDetail> = Object.fromEntries(
      places.map((place, index) => {
        const choiceId = `choice-${index + 1}`
        return [choiceId, toChoiceDetail(place, choiceId)]
      }),
    )

    const { session } = await getSession(event.sessionId)

    const choicesRecord: ChoicesRecord = {
      choices,
      expiration: session.expiration,
    }
    await putChoices(event.sessionId, choicesRecord)

    const choiceIds = Object.keys(choices)
    const { matchups, bye } = generateMatchups(choiceIds)
    const totalRounds = Math.ceil(Math.log2(choiceIds.length))

    await putSession(event.sessionId, {
      ...session,
      bracket: [matchups],
      byes: [bye],
      isReady: true,
      location,
      timeoutAt: undefined,
      totalRounds,
      votersSubmitted: 0,
    })

    log('Session ready', { sessionId: event.sessionId, choiceCount: choiceIds.length })
  } catch (error) {
    logError('Create session failed', error)
    await setErrorMessage(event.sessionId, 'Failed to fetch restaurants. Please try again.')
  }
}
