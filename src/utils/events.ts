import AJV from 'ajv/dist/jtd'
import jwt from 'jsonwebtoken'

import placeTypes from '../assets/place-types'
import { sessionExpireHours } from '../config'
import { APIGatewayProxyEventV2, LatLng, NewSession, PatchOperation } from '../types'

const ajv = new AJV({ allErrors: true })

// hours * 60 minutes / hour * 60 seconds / minute = 3_600
const SESSION_EXPIRATION_DURATION = sessionExpireHours * 3_600

const getTimeInSeconds = () => Math.floor(Date.now() / 1000)

/* Sessions */

export const formatSession = (session: NewSession): NewSession => {
  const placeTypeValues = placeTypes.map((t) => t.value)

  const jsonTypeDefinition = {
    optionalProperties: {
      expiration: { type: 'float64' },
      latitude: { type: 'float64' },
      longitude: { type: 'float64' },
    },
    properties: {
      address: { type: 'string' },
      exclude: { elements: { enum: placeTypeValues } },
      radius: { type: 'float64' },
      rankBy: { enum: ['DISTANCE', 'POPULARITY'] },
      type: { elements: { enum: placeTypeValues } },
      voterCount: { type: 'uint32' },
    },
  }
  const lastExpiration = getTimeInSeconds() + SESSION_EXPIRATION_DURATION

  if (ajv.validate(jsonTypeDefinition, session) === false) {
    throw new Error(JSON.stringify(ajv.errors))
  } else if ((session.expiration ?? 0) > lastExpiration) {
    throw new Error(
      JSON.stringify([
        {
          instancePath: '/expiration',
          keyword: 'value',
          message: 'must be less than the maximum allowed value',
          params: { maximum: [lastExpiration] },
          schemaPath: '/properties/expiration/value',
        },
      ]),
    )
  } else if ((session.latitude === undefined) !== (session.longitude === undefined)) {
    const [missing, present] = session.latitude === undefined ? ['latitude', 'longitude'] : ['longitude', 'latitude']
    throw new Error(
      JSON.stringify([
        {
          instancePath: `/${missing}`,
          keyword: 'value',
          message: `${missing} must be present when ${present} is defined`,
          schemaPath: `/properties/${missing}/value`,
        },
      ]),
    )
  } else if (
    session.rankBy === 'POPULARITY' &&
    (session.radius === undefined || session.radius < 1 || session.radius > 50_000)
  ) {
    throw new Error(
      JSON.stringify([
        {
          instancePath: '/radius',
          keyword: 'value',
          message: 'must be 1 thru 50,000 when rankBy is "POPULARITY"',
          params: { maximum: [50_000], minimum: [1] },
          schemaPath: '/properties/radius/value',
        },
      ]),
    )
  } else if (session.voterCount < 1 || session.voterCount > 10) {
    throw new Error(
      JSON.stringify([
        {
          instancePath: '/voterCount',
          keyword: 'value',
          message: 'must be 1 thru 10',
          params: { maximum: [10], minimum: [1] },
          schemaPath: '/properties/voterCount/value',
        },
      ]),
    )
  }

  return {
    address: session.address,
    exclude: session.exclude,
    expiration: session.expiration ?? lastExpiration,
    latitude: session.latitude,
    longitude: session.longitude,
    radius: session.radius,
    rankBy: session.rankBy,
    type: session.type,
    voterCount: session.voterCount,
  }
}

/* LatLng */

interface LatLngParams {
  latitude: number
  longitude: number
}

export const formatLatLng = (latLng: LatLngParams): LatLng => {
  const latitude = parseFloat(String(latLng.latitude))
  const longitude = parseFloat(String(latLng.longitude))
  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error(JSON.stringify({ message: 'latitude and longitude query parameters must be provided' }))
  } else if (latitude < -90 || latitude > 90) {
    throw new Error(JSON.stringify({ message: 'latitude must be between -90 and 90' }))
  } else if (longitude < -180 || longitude > 180) {
    throw new Error(JSON.stringify({ message: 'longitude must be between -180 and 180' }))
  }

  return { latitude, longitude }
}

/* Events */

const parseEventBody = (event: APIGatewayProxyEventV2): unknown =>
  JSON.parse(
    event.isBase64Encoded && event.body ? Buffer.from(event.body, 'base64').toString('utf8') : (event.body as string),
  )

export const extractNewSessionFromEvent = (event: APIGatewayProxyEventV2): NewSession =>
  formatSession(parseEventBody(event) as NewSession)

export const extractJsonPatchFromEvent = (event: APIGatewayProxyEventV2): PatchOperation[] =>
  parseEventBody(event) as PatchOperation[]

interface DecodedJWT {
  name: string
  phone_number?: string
  sub: string
}

export const extractJwtFromEvent = (event: APIGatewayProxyEventV2): DecodedJWT =>
  jwt.decode((event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer /i, '')) as DecodedJWT

export const extractLatLngFromEvent = (event: APIGatewayProxyEventV2): LatLng =>
  formatLatLng(event.queryStringParameters as unknown as LatLngParams)

export const extractTokenFromEvent = (event: APIGatewayProxyEventV2): string =>
  event.headers['x-recaptcha-token'] as string
