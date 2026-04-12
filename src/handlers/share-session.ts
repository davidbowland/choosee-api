import { corsDomain, maxUsersPerSession, smsRateLimitPerUser } from '../config'
import { DuplicatePhoneError, MaxUsersError, NotFoundError, RateLimitError, ValidationError } from '../errors'
import { createUser, getAllUsers, getSession, getUser, incrementTextsSent } from '../services/dynamodb'
import { sendSms } from '../services/sms'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, UserRecord } from '../types'
import { parseShareBody } from '../utils/events'
import { generateUserId } from '../utils/id-generator'
import { log, logError } from '../utils/logging'
import status from '../utils/status'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  log('Received event', { ...event, body: undefined })
  try {
    const sessionId = event.pathParameters?.sessionId as string
    const sharingUserId = event.pathParameters?.userId as string

    const { phone } = parseShareBody(event)

    const { session, users } = await getSession(sessionId)
    if (session.expiration < Math.floor(Date.now() / 1000)) {
      throw new NotFoundError('Session not found')
    }

    if (users.length >= maxUsersPerSession) {
      throw new MaxUsersError(`Session has reached the maximum of ${maxUsersPerSession} users`)
    }

    // Check if phone number is already in use by an existing user
    const allUsers = await getAllUsers(sessionId)
    if (allUsers.some((u) => u.phone === phone)) {
      throw new DuplicatePhoneError('A user with this phone number already exists in the session')
    }

    // Verify sharing user exists (throws NotFoundError if not)
    await getUser(sessionId, sharingUserId)

    // Atomic increment-with-limit — throws RateLimitError if at cap
    await incrementTextsSent(sessionId, sharingUserId, smsRateLimitPerUser)

    const userId = generateUserId(users)

    const newUser: UserRecord = {
      expiration: session.expiration,
      name: null,
      phone,
      subscribedRounds: [],
      textsSent: 0,
      userId,
      votes: Array.from({ length: session.currentRound + 1 }, () => []),
    }

    await createUser(sessionId, newUser)

    try {
      const link = `${corsDomain}/s/${sessionId}?id=${userId}`
      await sendSms(phone, `Help us decide where to eat! Tap here to vote: ${link}`)
    } catch (smsError) {
      // User was created and textsSent was incremented, but SMS failed.
      // The user stays — no delete. Caller gets an error so they can retry or inform the recipient another way.
      logError('SMS send failed after user creation', { sessionId, userId, smsError })
      return { ...status.INTERNAL_SERVER_ERROR, body: JSON.stringify({ message: 'Failed to send SMS', userId }) }
    }

    return { ...status.CREATED, body: JSON.stringify({ userId }) }
  } catch (error) {
    if (error instanceof NotFoundError) return status.NOT_FOUND
    if (error instanceof DuplicatePhoneError)
      return { ...status.UNPROCESSABLE_ENTITY, body: JSON.stringify({ message: error.message }) }
    if (error instanceof ValidationError)
      return { ...status.BAD_REQUEST, body: JSON.stringify({ message: error.message }) }
    if (error instanceof MaxUsersError)
      return { ...status.BAD_REQUEST, body: JSON.stringify({ message: error.message }) }
    if (error instanceof RateLimitError)
      return { ...status.TOO_MANY_REQUESTS, body: JSON.stringify({ message: error.message }) }
    logError(error)
    return status.INTERNAL_SERVER_ERROR
  }
}
