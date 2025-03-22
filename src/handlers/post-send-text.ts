import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from '../types'
import { log, logError } from '../utils/logging'
import { corsDomain } from '../config'
import { extractJwtFromEvent } from '../utils/events'
import { sendSms } from '../services/sms'
import status from '../utils/status'

export const postSendTextHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  try {
    const sessionId = event.pathParameters?.sessionId as string
    const jwtPayload = extractJwtFromEvent(event)
    if (jwtPayload === null) {
      return { ...status.FORBIDDEN, body: JSON.stringify({ message: 'Invalid JWT' }) }
    }
    await sendSms(jwtPayload.phone_number, `Your Choosee session is: ${corsDomain}/s/${sessionId}`)

    return status.NO_CONTENT
  } catch (error) {
    logError(error)
    return { ...status.INTERNAL_SERVER_ERROR }
  }
}
