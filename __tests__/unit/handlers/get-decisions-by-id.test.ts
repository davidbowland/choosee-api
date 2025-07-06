import { decision, session } from '../__mocks__'
import eventJson from '@events/get-decisions-by-id.json'
import { getDecisionsByIdHandler } from '@handlers/get-decisions-by-id'
import * as dynamodb from '@services/dynamodb'
import { APIGatewayProxyEventV2, Decision } from '@types'
import * as events from '@utils/events'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/events')
jest.mock('@utils/logging')

describe('get-decisions-by-id', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2
  const expectedResult: Decision = {
    decisions: { "Shakespeare's Pizza - Downtown": true },
    expiration: 1728533252,
  }

  beforeAll(() => {
    jest.mocked(dynamodb).getDecisionById.mockResolvedValue(decision)
    jest.mocked(dynamodb).getSessionById.mockResolvedValue(session)
    jest.mocked(events).extractJwtFromEvent.mockReturnValue(undefined)
  })

  describe('getDecisionsByIdHandler', () => {
    it('should return FORBIDDEN when userId does not match JWT', async () => {
      jest.mocked(events).extractJwtFromEvent.mockReturnValueOnce({ phone_number: 'doesnt_match' })
      const result = await getDecisionsByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.FORBIDDEN))
    })

    it('should return NOT_FOUND when getDecisionById rejects', async () => {
      jest.mocked(dynamodb).getDecisionById.mockRejectedValueOnce(undefined)
      const result = await getDecisionsByIdHandler(event)
      expect(result).toEqual(status.NOT_FOUND)
    })

    it('should return OK with results when id exists', async () => {
      const result = await getDecisionsByIdHandler(event)
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify(expectedResult),
      })
    })

    it('should return OK with results when no JWT provided', async () => {
      const tempEvent = { ...event, headers: {} }
      const result = await getDecisionsByIdHandler(tempEvent)
      expect(result).toEqual({
        ...status.OK,
        body: JSON.stringify(expectedResult),
      })
    })
  })
})
