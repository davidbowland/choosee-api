import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Session } from '../types'
import { deleteSessionById, getSessionById } from '../services/dynamodb'
import { log, logError } from '../utils/logging'
import status from '../utils/status'

const fetchDataThenDelete = async (sessionId: string): Promise<APIGatewayProxyResultV2<Session>> => {
  try {
    const data = await getSessionById(sessionId)
    try {
      await deleteSessionById(sessionId)
      return { ...status.OK, body: JSON.stringify(data) }
    } catch (error) {
      logError(error)
      return status.INTERNAL_SERVER_ERROR
    }
  } catch (error) {
    return status.NO_CONTENT
  }
}

export const deleteByIdHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<Session>> => {
  log('Received event', { ...event, body: undefined })
  const sessionId = event.pathParameters?.sessionId as string
  const result = await fetchDataThenDelete(sessionId)
  return result
}
