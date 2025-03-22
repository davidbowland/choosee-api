import { applyPatch } from 'fast-json-patch'

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Decision, PatchOperation } from '../types'
import { extractJsonPatchFromEvent, extractJwtFromEvent } from '../utils/events'
import { getDecisionById, getSessionById, setDecisionById, setSessionById } from '../services/dynamodb'
import { log, logError } from '../utils/logging'
import { mutateObjectOnJsonPatch, throwOnInvalidJsonPatch } from '../config'
import status from '../utils/status'
import { updateSessionStatus } from '../utils/session'

const updateDecisionAndSession = async (
  sessionId: string,
  userId: string,
  prevDecision: Decision,
  updatedDecision: Decision,
): Promise<APIGatewayProxyResultV2<any>> => {
  try {
    log('Updated decision', { prevDecision, sessionId, updatedDecision, userId })
    await setDecisionById(sessionId, userId, updatedDecision)

    const session = await getSessionById(sessionId)
    const updatedSession = await updateSessionStatus(sessionId, session)
    log('Updated session', { prevSession: session, sessionId, updatedSession })
    await setSessionById(sessionId, updatedSession)

    return { ...status.OK, body: JSON.stringify(updatedDecision) }
  } catch (error) {
    logError(error)
    return status.INTERNAL_SERVER_ERROR
  }
}

const applyJsonPatch = async (
  sessionId: string,
  userId: string,
  patchOperations: PatchOperation[],
): Promise<APIGatewayProxyResultV2<any>> => {
  try {
    const decision = await getDecisionById(sessionId, userId)
    try {
      const updatedDecision = applyPatch(
        decision,
        patchOperations,
        throwOnInvalidJsonPatch,
        mutateObjectOnJsonPatch,
      ).newDocument
      return await updateDecisionAndSession(sessionId, userId, decision, updatedDecision)
    } catch (error: any) {
      return { ...status.BAD_REQUEST, body: JSON.stringify({ message: error.message }) }
    }
  } catch (error) {
    return status.NOT_FOUND
  }
}

export const patchDecisionByIdHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  try {
    const sessionId = event.pathParameters?.sessionId as string
    const userId = event.pathParameters?.userId as string

    const jwtPayload = extractJwtFromEvent(event)
    if (jwtPayload && jwtPayload.phone_number !== userId) {
      return { ...status.FORBIDDEN, body: JSON.stringify({ message: 'Invalid JWT' }) }
    }

    const patchOperations = extractJsonPatchFromEvent(event)
    const result = await applyJsonPatch(sessionId, userId, patchOperations)
    return result
  } catch (error: any) {
    return { ...status.BAD_REQUEST, body: JSON.stringify({ message: error.message }) }
  }
}
