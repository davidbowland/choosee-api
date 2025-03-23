import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, SessionBatch } from '../types'
import { log, logError } from '../utils/logging'
import { scanSessions } from '../services/dynamodb'
import status from '../utils/status'

export const getAllItemsHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<SessionBatch[]>> => {
  log('Received event', event)
  try {
    const data = await scanSessions()
    return { ...status.OK, body: JSON.stringify(data) }
  } catch (error) {
    logError(error)
    return status.INTERNAL_SERVER_ERROR
  }
}
