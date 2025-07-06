import { choice, place1, session, sessionId, userId } from '../__mocks__'
import * as dynamodb from '@services/dynamodb'
import { updateSessionStatus } from '@utils/session'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('sessions', () => {
  const mockRandom = jest.fn()

  beforeAll(() => {
    jest.mocked(dynamodb).getChoiceById.mockResolvedValue(choice)
    jest.mocked(dynamodb).getDecisionById.mockResolvedValue({ decisions: { Columbia: true }, expiration: 0 })
    jest.mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValue(['+15551234567', '+15551234568'])

    Math.random = mockRandom.mockReturnValue(0)
  })

  describe('updateSessionStatus', () => {
    describe('unchanged', () => {
      it('should leave status unchanged when no users', async () => {
        jest.mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValueOnce([])
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(session)
      })

      it('should leave status unchanged when only one voter', async () => {
        jest.mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValueOnce([userId])
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(session)
      })

      it('should leave status unchanged when one decision matches', async () => {
        jest.mocked(dynamodb).getDecisionById.mockResolvedValueOnce({
          decisions: { "Shakespeare's Pizza - Downtown": true },
          expiration: 0,
        })
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(session)
      })
    })

    describe('winner', () => {
      beforeAll(() => {
        jest.mocked(dynamodb).getDecisionById.mockResolvedValue({
          decisions: {
            'Flat Branch Pub & Brewing': true,
            "Shakespeare's Pizza - Downtown": true,
          },
          expiration: 0,
        })
      })

      it('should change status to winner when decisions match', async () => {
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'winner', winner: place1 } }))
      })

      it('should change status to winner when voter count hit', async () => {
        jest.mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValueOnce([userId])
        const decisionMatchSession = {
          ...session,
          voterCount: 1,
        }
        const result = await updateSessionStatus(sessionId, decisionMatchSession)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'winner', winner: place1 } }))
      })

      it('should leave winner unchanged when already winner', async () => {
        const newPlace = { ...place1, name: 'Bobs Burgers' }
        const decisionMatchSession = {
          ...session,
          status: { current: 'winner' as any, winner: newPlace },
          voterCount: 1,
        }
        const result = await updateSessionStatus(sessionId, decisionMatchSession)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'winner', winner: newPlace } }))
      })
    })

    describe('deciding', () => {
      it('should set deciding status when not all choices have a decision', async () => {
        jest.mocked(dynamodb).getDecisionById.mockResolvedValueOnce({ decisions: { Columbia: false }, expiration: 0 })
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'deciding' } }))
      })
    })

    describe('finished', () => {
      it('should set deciding status when all choices have a decision but no matches', async () => {
        jest.mocked(dynamodb).getDecisionById.mockResolvedValueOnce({
          decisions: {
            'Flat Branch Pub & Brewing': false,
            "Shakespeare's Pizza - Downtown": false,
          },
          expiration: 0,
        })
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'finished' } }))
      })
    })
  })
})
