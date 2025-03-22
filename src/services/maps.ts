import axios from 'axios'

import { Choice, NewChoice, PlaceDetails } from '../types'
import { mapsApiKey, mapsApiUrl } from '../config'
import { xrayCaptureHttps } from '../utils/logging'

xrayCaptureHttps()
const api = axios.create({
  baseURL: mapsApiUrl,
  headers: { 'x-api-key': mapsApiKey },
})

export const createChoices = (body: NewChoice): Promise<Choice> =>
  api.post('/choices', body, {}).then((response) => response.data)

export const fetchChoices = (choiceId: string): Promise<PlaceDetails[]> =>
  api.get(`/choices/${encodeURIComponent(choiceId)}`).then((response) => response.data.choices)
