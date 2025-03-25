export * from 'aws-lambda'
export { Operation as PatchOperation } from 'fast-json-patch'
export * from '@googlemaps/google-maps-services-js'
export * from '@googlemaps/places'

export type PriceLevel =
  | 'PRICE_LEVEL_UNSPECIFIED'
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE'

export type RankByType = 'DISTANCE' | 'POPULARITY'

// Choices

export interface Choice {
  address: string
  choices: PlaceDetails[]
  exclude: string[]
  expiration: number
  latLng: LatLng
  radius: number
  rankBy: RankByType
  type: string[]
}

export interface ChoiceBatch {
  data: Choice
  id: string
}

export interface NewChoice {
  address: string
  exclude: string[]
  expiration?: number
  latitude?: number
  longitude?: number
  radius: number
  rankBy: RankByType
  type: string[]
}

// Decisions

export interface DecisionObject {
  [key: string]: boolean
}

export interface Decision {
  decisions: DecisionObject
}

// Sessions

export interface Session {
  address: string
  choiceId: string
  exclude: string[]
  expiration: number
  location: LatLng
  owner?: string
  radius: number
  rankBy: RankByType
  status: StatusObject
  type: string[]
  voterCount: number
}

export interface NewSession {
  address: string
  exclude: string[]
  expiration?: number
  latitude?: number
  longitude?: number
  radius: number
  rankBy: RankByType
  type: string[]
  voterCount: number
}

export interface StatusObject {
  current: 'deciding' | 'winner' | 'finished'
  winner?: PlaceDetails
}

// Places

export interface PlaceDetails {
  formattedAddress?: string | null
  formattedPhoneNumber?: string | null
  internationalPhoneNumber?: string | null
  name?: string | null
  openHours?: string[] | null
  photos: string[]
  placeId: string
  priceLevel?: PriceLevel | null
  rating?: number | null
  ratingsTotal?: number | null
  website?: string | null
}

export interface PlaceResponse {
  data: PlaceDetails[]
  nextPageToken: string
}

export interface LatLng {
  latitude: number
  longitude: number
}

export interface GeocodedAddress {
  address: string
  latLng: LatLng
}

// SMS

export type MessageType = 'PROMOTIONAL' | 'TRANSACTIONAL'

export interface SMSMessage {
  to: string
  contents: string
  messageType?: MessageType
}

// Misc
export interface StringObject {
  [key: string]: any
}
