import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from '../types'
import { getSessionById, setSessionById } from '../services/dynamodb'
import { log, logError } from '../utils/logging'
import status from '../utils/status'
import { updateSessionStatus } from '../utils/session'

export const postUpdateStatus = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  try {
    const sessionId = event.pathParameters?.sessionId as string

    const session = await getSessionById(sessionId)
    const updatedSession = await updateSessionStatus(sessionId, session)
    log('Updated session', { prevSession: session, sessionId, updatedSession })
    await setSessionById(sessionId, updatedSession)

    return { ...status.OK, body: JSON.stringify(updatedSession) }
  } catch (error) {
    logError(error)
    return status.INTERNAL_SERVER_ERROR
  }
}
