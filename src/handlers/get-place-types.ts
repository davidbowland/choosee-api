import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from '../types'
import { log } from '../utils/logging'
import placeTypes from '../assets/place-types'
import status from '../utils/status'

export const getPlaceTypesHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  const placeTypesDisplay = placeTypes.map((t: string) => ({
    display: t.charAt(0).toLocaleUpperCase() + t.slice(1).replace(/_/g, ' '),
    value: t,
  }))
  return { ...status.OK, body: JSON.stringify({ types: placeTypesDisplay }) }
}
