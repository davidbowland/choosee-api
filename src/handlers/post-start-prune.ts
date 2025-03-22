import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from '../types'
import {
  deleteDecisionById,
  deleteSessionById,
  queryUserIdsBySessionId,
  scanExpiredSessionIds,
} from '../services/dynamodb'
import { log, logError } from '../utils/logging'
import status from '../utils/status'

const deleteDecisionsForSession = async (sessionId: string) => {
  const ids = await queryUserIdsBySessionId(sessionId)
  for (const userId of ids) {
    await deleteDecisionById(sessionId, userId)
  }
}

export const postStartPruneHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  try {
    const ids = await scanExpiredSessionIds()
    for (const sessionId of ids) {
      await deleteDecisionsForSession(sessionId)
      await deleteSessionById(sessionId)
    }

    return status.NO_CONTENT
  } catch (error) {
    logError(error)
    return { ...status.INTERNAL_SERVER_ERROR }
  }
}
