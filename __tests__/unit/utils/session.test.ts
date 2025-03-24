import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import { choice, place1, session, sessionId, userId } from '../__mocks__'
import { updateSessionStatus } from '@utils/session'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('sessions', () => {
  const mockRandom = jest.fn()

  beforeAll(() => {
    mocked(dynamodb).getChoiceById.mockResolvedValue(choice)
    mocked(dynamodb).getDecisionById.mockResolvedValue({ decisions: { Columbia: true } })
    mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValue(['+15551234567', '+15551234568'])

    Math.random = mockRandom.mockReturnValue(0)
  })

  describe('updateSessionStatus', () => {
    describe('unchanged', () => {
      test('expect status unchanged when no users', async () => {
        mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValueOnce([])
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(session)
      })

      test('expect status unchanged when only one voter', async () => {
        mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValueOnce([userId])
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(session)
      })

      test('expect status unchanged when one decision matches', async () => {
        mocked(dynamodb).getDecisionById.mockResolvedValueOnce({
          decisions: { "Shakespeare's Pizza - Downtown": true },
        })
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(session)
      })
    })

    describe('winner', () => {
      beforeAll(() => {
        mocked(dynamodb).getDecisionById.mockResolvedValue({
          decisions: {
            'Flat Branch Pub & Brewing': true,
            "Shakespeare's Pizza - Downtown": true,
          },
        })
      })

      test('expect status changed to winner when decisions match', async () => {
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'winner', winner: place1 } }))
      })

      test('expect status changed to winner when voter count hit', async () => {
        mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValueOnce([userId])
        const decisionMatchSession = {
          ...session,
          voterCount: 1,
        }
        const result = await updateSessionStatus(sessionId, decisionMatchSession)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'winner', winner: place1 } }))
      })

      test('expect winner unchanged when already winner', async () => {
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
      test('expect deciding status when not all choices have a decision', async () => {
        mocked(dynamodb).getDecisionById.mockResolvedValueOnce({ decisions: { Columbia: false } })
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'deciding' } }))
      })
    })

    describe('finished', () => {
      test('expect deciding status when all choices have a decision but no matches', async () => {
        mocked(dynamodb).getDecisionById.mockResolvedValueOnce({
          decisions: {
            'Flat Branch Pub & Brewing': false,
            "Shakespeare's Pizza - Downtown": false,
          },
        })
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'finished' } }))
      })
    })
  })
})
