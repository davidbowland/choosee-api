import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Choice,
  GeocodedAddress,
  NewChoice,
  NewSession,
  RankByType,
  Session,
} from '../types'
import { extractJwtFromEvent, extractNewSessionFromEvent } from '../utils/events'
import { fetchGeocodeResults, fetchPlaceResults } from '../services/google-maps'
import { getChoiceById, getSessionById, setChoiceById, setSessionById } from '../services/dynamodb'
import { log, logError } from '../utils/logging'
import { getNextId } from '../utils/id-generator'
import { getScoreFromEvent } from '../services/recaptcha'
import status from '../utils/status'

const getGeocodedAddress = async (newChoice: NewChoice): Promise<GeocodedAddress> => {
  if (newChoice.latitude !== undefined && newChoice.longitude !== undefined) {
    return { address: newChoice.address, latLng: { latitude: newChoice.latitude, longitude: newChoice.longitude } }
  }
  return await fetchGeocodeResults(newChoice.address)
}

const createChoice = async (newChoice: NewChoice): Promise<APIGatewayProxyResultV2<any>> => {
  const geocodedAddress = await getGeocodedAddress(newChoice)
  const places = await fetchPlaceResults(geocodedAddress.latLng, newChoice.type, newChoice.rankBy, newChoice.radius)
  log('Google API results', JSON.stringify({ geocodedAddress, places }))

  const choiceId = await getNextId(getChoiceById)
  const choice: Choice = {
    address: geocodedAddress.address,
    choices: places,
    exclude: newChoice.exclude,
    expiration: newChoice.expiration as number,
    latLng: geocodedAddress.latLng,
    radius: newChoice.radius,
    rankBy: newChoice.rankBy as RankByType,
    type: newChoice.type,
  }
  log('Creating choices', JSON.stringify({ choice, choiceId }))
  await setChoiceById(choiceId, choice)
  return { ...choice, choiceId }
}

const createNewSession = async (newSession: NewSession, owner?: string): Promise<APIGatewayProxyResultV2<any>> => {
  try {
    const choice = await createChoice({
      address: newSession.address,
      exclude: newSession.exclude,
      expiration: newSession.expiration,
      latitude: newSession.latitude,
      longitude: newSession.longitude,
      radius: newSession.radius,
      rankBy: newSession.rankBy,
      type: newSession.type,
    })

    const sessionId = await getNextId(getSessionById)
    const session: Session = {
      address: choice.address,
      choiceId: choice.choiceId as string,
      exclude: choice.exclude,
      expiration: newSession.expiration as number,
      location: choice.latLng,
      owner,
      radius: choice.radius,
      rankBy: choice.rankBy as RankByType,
      status: {
        current: choice.choices.length > 0 ? 'deciding' : 'finished',
      },
      type: choice.type,
      voterCount: newSession.voterCount,
    }
    log('Creating session', { session, sessionId })
    await setSessionById(sessionId, session)

    return {
      ...status.CREATED,
      body: JSON.stringify({ ...session, sessionId }),
    }
  } catch (error) {
    logError(error)
    return status.INTERNAL_SERVER_ERROR
  }
}

export const postSessionHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<any>> => {
  try {
    const newSession = extractNewSessionFromEvent(event)
    const jwtPayload = extractJwtFromEvent(event)
    return await createNewSession(newSession, jwtPayload === null ? undefined : jwtPayload.sub)
  } catch (error: any) {
    return { ...status.BAD_REQUEST, body: JSON.stringify({ message: error.message }) }
  }
}

export const postSessionHandlerAuthenticated = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  return await postSessionHandler(event)
}

export const postSessionHandlerUnauthenticated = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  try {
    const score = await getScoreFromEvent(event)
    log('reCAPTCHA result', { score })
    if (score < 0.7) {
      return status.FORBIDDEN
    }
  } catch (error) {
    return status.INTERNAL_SERVER_ERROR
  }

  return await postSessionHandler(event)
}
