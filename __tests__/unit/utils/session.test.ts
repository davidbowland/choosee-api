import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import * as maps from '@services/maps'
import { choice, place, session, sessionId, userId } from '../__mocks__'
import { updateSessionStatus } from '@utils/session'

jest.mock('@services/dynamodb')
jest.mock('@services/maps')
jest.mock('@utils/logging')

describe('sessions', () => {
  beforeAll(() => {
    mocked(dynamodb).getDecisionById.mockResolvedValue({ decisions: { Columbia: true } })
    mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValue(['+15551234567', '+15551234568'])
    mocked(maps).advanceRounds.mockResolvedValue(choice)
    mocked(maps).fetchChoices.mockResolvedValue([place])
  })

  describe('updateSessionStatus', () => {
    const winningPlace = {
      ...place,
      formattedAddress: '225 S 9th St, Columbia, MO 65201, USA',
      formattedPhoneNumber: '(573) 449-2454',
      internationalPhoneNumber: '+1 573-449-2454',
      openHours: [
        'Monday: 11:00 AM – 10:00 PM',
        'Tuesday: 11:00 AM – 10:00 PM',
        'Wednesday: 11:00 AM – 10:00 PM',
        'Thursday: 11:00 AM – 10:00 PM',
        'Friday: 11:00 AM – 11:00 PM',
        'Saturday: 11:00 AM – 11:00 PM',
        'Sunday: 11:00 AM – 10:00 PM',
      ],
      website: 'http://www.shakespeares.com/',
    }

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
      test('expect status changed to winner when decisions match', async () => {
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'winner', pageId: 0, winner: place } }))
      })

      test('expect status changed to winner enhanced with details', async () => {
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(
          expect.objectContaining({ status: { current: 'winner', pageId: 0, winner: winningPlace } }),
        )
      })

      test('expect status changed to winner when voter count hit', async () => {
        mocked(dynamodb).queryUserIdsBySessionId.mockResolvedValueOnce([userId])
        const decisionMatchSession = {
          ...session,
          voterCount: 1,
        }
        const result = await updateSessionStatus(sessionId, decisionMatchSession)
        expect(result).toEqual(
          expect.objectContaining({ status: { current: 'winner', pageId: 0, winner: winningPlace } }),
        )
      })

      test('expect winner unchanged when already winner', async () => {
        const newPlace = { ...place, name: 'Bobs Burgers' }
        const decisionMatchSession = {
          ...session,
          status: { current: 'winner' as any, pageId: 0, winner: newPlace },
          voterCount: 1,
        }
        const result = await updateSessionStatus(sessionId, decisionMatchSession)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'winner', pageId: 0, winner: newPlace } }))
      })
    })

    describe('deciding', () => {
      test('expect pageId changed when no decision match', async () => {
        mocked(dynamodb).getDecisionById.mockResolvedValueOnce({ decisions: { Columbia: false } })
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'deciding', pageId: 1 } }))
      })
    })

    describe('finished', () => {
      beforeAll(() => {
        mocked(dynamodb).getDecisionById.mockResolvedValue({ decisions: { Columbia: false } })
      })

      test('expect status to be finished when no more results', async () => {
        mocked(maps).advanceRounds.mockResolvedValue({ ...choice, choices: [] })
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'finished', pageId: 1 } }))
      })

      test('expect status to be finished when advanceRounds rejects', async () => {
        mocked(maps).advanceRounds.mockRejectedValue(undefined)
        const result = await updateSessionStatus(sessionId, session)
        expect(result).toEqual(expect.objectContaining({ status: { current: 'finished', pageId: 1 } }))
      })
    })
  })
})
