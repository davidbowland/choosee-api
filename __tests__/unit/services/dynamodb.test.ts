import { choice, choiceId, decision, session, sessionId, userId } from '../__mocks__'
import {
  getChoiceById,
  getDecisionById,
  getSessionById,
  queryUserIdsBySessionId,
  setChoiceById,
  setDecisionById,
  setSessionById,
} from '@services/dynamodb'

const mockSend = jest.fn()
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DeleteItemCommand: jest.fn().mockImplementation((x) => x),
  DynamoDB: jest.fn(() => ({
    send: (...args) => mockSend(...args),
  })),
  GetItemCommand: jest.fn().mockImplementation((x) => x),
  PutItemCommand: jest.fn().mockImplementation((x) => x),
  QueryCommand: jest.fn().mockImplementation((x) => x),
  ScanCommand: jest.fn().mockImplementation((x) => x),
}))
jest.mock('@utils/logging', () => ({
  xrayCapture: jest.fn().mockImplementation((x) => x),
}))

describe('dynamodb', () => {
  const epochTime = 1678432576539

  beforeAll(() => {
    Date.now = () => epochTime
  })

  /* Choices */

  describe('getChoiceById', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      mockSend.mockResolvedValueOnce({
        Item: { Data: { S: JSON.stringify(choice) } },
      })

      const result = await getChoiceById(choiceId)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: {
            ChoiceId: {
              S: choiceId,
            },
          },
          TableName: 'choices-table',
        }),
      )
      expect(result).toEqual(choice)
    })
  })

  describe('setChoiceById', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      await setChoiceById(choiceId, choice)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: {
            ChoiceId: {
              S: choiceId,
            },
            Data: {
              S: JSON.stringify(choice),
            },
            Expiration: {
              N: '1728547851',
            },
          },
          TableName: 'choices-table',
        }),
      )
    })
  })

  /* Decisions */

  describe('getDecisionById', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      mockSend.mockResolvedValueOnce({
        Item: { Data: { S: JSON.stringify(decision) } },
      })

      const result = await getDecisionById(sessionId, userId)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: {
            SessionId: {
              S: sessionId,
            },
            UserId: {
              S: userId,
            },
          },
          TableName: 'decision-table',
        }),
      )
      expect(result).toEqual(decision)
    })

    test('should return empty decisions when invalid JSON', async () => {
      mockSend.mockResolvedValueOnce({
        Item: { Data: { S: 'fnord' } },
      })

      const result = await getDecisionById(sessionId, userId)

      expect(result).toEqual({ decisions: {}, expiration: 1678540576 })
    })
  })

  describe('setDecisionById', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      await setDecisionById(sessionId, userId, decision)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: {
            Data: {
              S: JSON.stringify(decision),
            },
            Expiration: { N: '1728533252' },
            SessionId: {
              S: sessionId,
            },
            UserId: {
              S: userId,
            },
          },
          TableName: 'decision-table',
        }),
      )
    })
  })

  /* Sessions */

  describe('getSessionById', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      mockSend.mockResolvedValueOnce({
        Item: { Data: { S: JSON.stringify(session) } },
      })

      const result = await getSessionById(sessionId)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: {
            SessionId: {
              S: sessionId,
            },
          },
          TableName: 'session-table',
        }),
      )
      expect(result).toEqual(session)
    })
  })

  describe('queryUserIdsBySessionId', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ UserId: { S: userId } }],
      })

      const result = await queryUserIdsBySessionId(sessionId)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: {
            ':v1': {
              S: sessionId,
            },
          },
          KeyConditionExpression: 'SessionId = :v1',
          ProjectionExpression: 'UserId',
          TableName: 'decision-table',
        }),
      )
      expect(result).toEqual([userId])
    })
  })

  describe('setSessionById', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      await setSessionById(sessionId, session)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: {
            Data: {
              S: JSON.stringify(session),
            },
            Expiration: {
              N: `${session.expiration}`,
            },
            SessionId: {
              S: sessionId,
            },
          },
          TableName: 'session-table',
        }),
      )
    })
  })
})
