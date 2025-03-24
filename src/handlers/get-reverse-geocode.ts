import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from '../types'
import { log, logError } from '../utils/logging'
import { extractLatLngFromEvent } from '../utils/events'
import { fetchAddressFromGeocode } from '../services/google-maps'
import { getScoreFromEvent } from '../services/recaptcha'
import status from '../utils/status'

export const getReverseGeocodeHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<any>> => {
  try {
    const { latitude, longitude } = extractLatLngFromEvent(event)

    try {
      const result = await fetchAddressFromGeocode(latitude, longitude)
      const address = result.data.results[0]?.formatted_address
      if (address === undefined) {
        return status.NOT_FOUND
      }
      return { ...status.OK, body: JSON.stringify({ address }) }
    } catch (error) {
      logError(error)
      return status.INTERNAL_SERVER_ERROR
    }
  } catch (error: any) {
    return { ...status.BAD_REQUEST, body: error.message }
  }
}

export const getReverseGeocodeHandlerAuthenticated = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  return await getReverseGeocodeHandler(event)
}

export const getReverseGeocodeHandlerUnauthenticated = async (
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
    logError(error)
    return status.INTERNAL_SERVER_ERROR
  }
  return await getReverseGeocodeHandler(event)
}
