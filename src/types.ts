export * from 'aws-lambda'
export { Operation as PatchOperation } from 'fast-json-patch'
export * from '@googlemaps/google-maps-services-js'

import { LatLng } from '@googlemaps/google-maps-services-js'

export type PlaceType = 'restaurant' | 'meal_delivery' | 'meal_takeaway' | 'bar' | 'cafe' | 'night_club'

export type RankByType = 'distance' | 'prominence'

export interface PlaceDetails {
  formattedAddress?: string
  formattedPhoneNumber?: string
  internationalPhoneNumber?: string
  name: string
  openHours?: string[]
  photos: string[]
  placeId: string
  priceLevel: number
  rating: number
  ratingsTotal?: number
  vicinity: string
  website?: string
}

export interface DecisionObject {
  [key: string]: boolean
}

export interface Decision {
  decisions: DecisionObject
}

export interface StatusObject {
  current: 'deciding' | 'winner' | 'finished'
  pageId: number
  winner?: PlaceDetails
}

export interface Session {
  address: string
  choiceId: string
  expiration: number
  location: LatLng
  maxPrice: number
  minPrice: number
  openNow: boolean
  owner?: string
  pagesPerRound: number
  radius?: number
  rankBy: RankByType
  status: StatusObject
  type: PlaceType
  voterCount: number
}

export interface SessionBatch {
  data: Session
  id: string
}

export interface NewSession {
  address: string
  expiration?: number
  maxPrice?: number
  minPrice?: number
  openNow?: boolean
  pagesPerRound?: number
  radius?: number
  rankBy?: RankByType
  type: PlaceType
  voterCount: number
}

export interface Choice {
  address: string
  choiceId?: string
  choices: PlaceDetails[]
  expiration: number
  latLng: LatLng
  nextPageToken: string
  maxPrice: number
  minPrice: number
  openNow: boolean
  pagesPerRound: number
  radius?: number
  rankBy: string
  type: PlaceType
}

export interface NewChoice {
  address: string
  expiration?: number
  lat?: number
  lng?: number
  maxPrice?: number
  minPrice?: number
  openNow?: boolean
  pagesPerRound?: number
  radius?: number
  rankBy?: string
  type: PlaceType
}

export interface PlaceResponse {
  data: PlaceDetails[]
  nextPageToken: string
}

export interface StringObject {
  [key: string]: any
}

export type MessageType = 'PROMOTIONAL' | 'TRANSACTIONAL'

export interface SMSMessage {
  to: string
  contents: string
  messageType?: MessageType
}
