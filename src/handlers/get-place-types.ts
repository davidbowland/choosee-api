import placeTypes from '../assets/place-types'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from '../types'
import { log } from '../utils/logging'
import status from '../utils/status'

export const getPlaceTypesHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  return { ...status.OK, body: JSON.stringify({ types: placeTypes }) }
}
