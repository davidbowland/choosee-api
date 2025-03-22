import jwt from 'jsonwebtoken'

import { APIGatewayProxyEventV2, NewSession, PatchOperation, StringObject } from '../types'
import { sessionExpireHours } from '../config'

// 60 minutes * 60 seconds * 1000 milliseconds = 3_600_000
const EXPIRATION_DURATION = sessionExpireHours * 3_600_000

/* Choosee */

export const formatSession = (session: NewSession): NewSession => {
  if (!session.address) {
    throw new Error('address missing from request')
  }
  const lastExpiration = new Date().getTime() + EXPIRATION_DURATION
  if (session.expiration !== undefined && session.expiration > lastExpiration) {
    throw new Error('expiration is outside acceptable range')
  }
  if (session.maxPrice !== undefined && (session.maxPrice < 0 || session.maxPrice > 4)) {
    throw new Error('maxPrice must be 0 thru 4')
  }
  if (session.minPrice !== undefined && (session.minPrice < 0 || session.minPrice > 4)) {
    throw new Error('minPrice must be 0 thru 4')
  }
  if (session.maxPrice !== undefined && session.minPrice !== undefined && session.maxPrice < session.minPrice) {
    throw new Error('minPrice must be less or equal to than maxPrice')
  }
  if (session.pagesPerRound !== undefined && (session.pagesPerRound < 1 || session.pagesPerRound > 2)) {
    throw new Error('pagesPerRound must be 1 thru 2')
  }
  if (session.rankBy !== 'distance' && session.rankBy !== 'prominence') {
    throw new Error('rankBy must be "distance" or "prominence"')
  }
  if (
    session.rankBy === 'prominence' &&
    (session.radius === undefined || session.radius < 1 || session.radius > 50_000)
  ) {
    throw new Error('radius must be 1 thru 50,000 when rankBy is "prominence"')
  }
  if (['restaurant', 'meal_delivery', 'meal_takeaway', 'bar', 'cafe', 'night_club'].indexOf(session.type) < 0) {
    throw new Error('type must be one of "restaurant", "meal_delivery", "meal_takeaway", "bar", "cafe", "night_club"')
  }
  if (session.voterCount === undefined || session.voterCount < 1 || session.voterCount > 10) {
    throw new Error('voterCount must be 1 thru 10')
  }
  return {
    address: session.address,
    expiration: session.expiration ?? lastExpiration,
    maxPrice: session.maxPrice,
    minPrice: session.minPrice,
    openNow: session.openNow ?? false,
    pagesPerRound: session.pagesPerRound ?? 1,
    radius: session.radius,
    rankBy: session.rankBy,
    type: session.type,
    voterCount: session.voterCount,
  }
}

/* Event */

const parseEventBody = (event: APIGatewayProxyEventV2): unknown =>
  JSON.parse(
    event.isBase64Encoded && event.body ? Buffer.from(event.body, 'base64').toString('utf8') : (event.body as string),
  )

export const extractNewSessionFromEvent = (event: APIGatewayProxyEventV2): NewSession =>
  formatSession(parseEventBody(event) as NewSession)

export const extractJsonPatchFromEvent = (event: APIGatewayProxyEventV2): PatchOperation[] =>
  parseEventBody(event) as PatchOperation[]

export const extractJwtFromEvent = (event: APIGatewayProxyEventV2): StringObject =>
  jwt.decode(
    (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer /i, ''),
  ) as StringObject

export const extractTokenFromEvent = (event: APIGatewayProxyEventV2): string =>
  event.headers['x-recaptcha-token'] as string
