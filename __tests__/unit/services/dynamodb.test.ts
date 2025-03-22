import { decision, session, sessionId, userId } from '../__mocks__'
import {
  deleteDecisionById,
  deleteSessionById,
  getDecisionById,
  getSessionById,
  queryUserIdsBySessionId,
  scanExpiredSessionIds,
  scanSessions,
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
    jest.spyOn(Date.prototype, 'getTime').mockReturnValue(epochTime)
  })

  describe('deleteDecisionById', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      await deleteDecisionById(sessionId, userId)

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
    })
  })

  describe('deleteSessionById', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      await deleteSessionById(sessionId)

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
    })
  })

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

      expect(result).toEqual({ decisions: [] })
    })
  })

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

  describe('scanExpiredSessionIds', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ SessionId: { S: sessionId } }],
      })

      const result = await scanExpiredSessionIds()

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: {
            ':v1': {
              N: '1',
            },
            ':v2': {
              N: `${epochTime}`,
            },
          },
          FilterExpression: 'Expiration BETWEEN :v1 AND :v2',
          IndexName: 'ExpirationIndex',
          TableName: 'session-table',
        }),
      )
      expect(result).toEqual([sessionId])
    })
  })

  describe('scanSessions', () => {
    test('should call DynamoDB with the correct arguments', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ Data: { S: JSON.stringify(session) }, SessionId: { S: sessionId } }],
      })

      const result = await scanSessions()

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          AttributesToGet: ['Data', 'SessionId', 'Expiration'],
          TableName: 'session-table',
        }),
      )
      expect(result).toEqual([{ data: session, id: sessionId }])
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

    test('should call DynamoDB with the correct arguments when no expiration', async () => {
      const noExpirationSession = { ...session, expiration: undefined }
      await setSessionById(sessionId, noExpirationSession)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: {
            Data: {
              S: JSON.stringify(noExpirationSession),
            },
            Expiration: {
              N: '0',
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
