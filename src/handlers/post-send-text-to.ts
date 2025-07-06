import { corsDomain } from '../config'
import { sendSms } from '../services/sms'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from '../types'
import { extractJwtFromEvent } from '../utils/events'
import { log, logError } from '../utils/logging'
import status from '../utils/status'

export const postSendTextToHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  try {
    const sessionId = event.pathParameters?.sessionId as string
    const toUserId = event.pathParameters?.toUserId as string
    const jwtPayload = extractJwtFromEvent(event)
    if (jwtPayload === null) {
      return { ...status.FORBIDDEN, body: JSON.stringify({ message: 'Invalid JWT' }) }
    }
    if (toUserId.match(/^\+1[2-9]\d{9}$/) === null) {
      return { ...status.BAD_REQUEST, body: JSON.stringify({ message: 'Invalid phone number' }) }
    }

    await sendSms(
      toUserId,
      `${jwtPayload.name} (${
        jwtPayload.phone_number
      }) is inviting you to vote: ${corsDomain}/s/${sessionId}?u=${encodeURIComponent(toUserId)}`,
    )

    return status.NO_CONTENT
  } catch (error) {
    logError(error)
    return { ...status.INTERNAL_SERVER_ERROR }
  }
}
