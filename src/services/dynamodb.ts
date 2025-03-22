import {
  DeleteItemCommand,
  DeleteItemOutput,
  DynamoDB,
  GetItemCommand,
  PutItemCommand,
  PutItemOutput,
  QueryCommand,
  ScanCommand,
  ScanOutput,
} from '@aws-sdk/client-dynamodb'

import { Decision, Session, SessionBatch } from '../types'
import { dynamodbDecisionTableName, dynamodbSessionTableName } from '../config'
import { xrayCapture } from '../utils/logging'

const dynamodb = xrayCapture(new DynamoDB({ apiVersion: '2012-08-10' }))

/* Delete item */

export const deleteDecisionById = async (sessionId: string, userId: string): Promise<DeleteItemOutput> => {
  const command = new DeleteItemCommand({
    Key: {
      SessionId: {
        S: `${sessionId}`,
      },
      UserId: {
        S: `${userId}`,
      },
    },
    TableName: dynamodbDecisionTableName,
  })
  return dynamodb.send(command)
}

export const deleteSessionById = async (sessionId: string): Promise<DeleteItemOutput> => {
  const command = new DeleteItemCommand({
    Key: {
      SessionId: {
        S: `${sessionId}`,
      },
    },
    TableName: dynamodbSessionTableName,
  })
  return dynamodb.send(command)
}

/* Get single item */

export const getDecisionById = async (sessionId: string, userId: string): Promise<Decision> => {
  const command = new GetItemCommand({
    Key: {
      SessionId: {
        S: `${sessionId}`,
      },
      UserId: {
        S: `${userId}`,
      },
    },
    TableName: dynamodbDecisionTableName,
  })
  const response = await dynamodb.send(command)
  try {
    return JSON.parse(response.Item.Data.S)
  } catch (e) {
    return { decisions: [] } as unknown as Decision
  }
}

export const getSessionById = async (sessionId: string): Promise<Session> => {
  const command = new GetItemCommand({
    Key: {
      SessionId: {
        S: `${sessionId}`,
      },
    },
    TableName: dynamodbSessionTableName,
  })
  const response = await dynamodb.send(command)
  return JSON.parse(response.Item.Data.S)
}

/* Query for user IDs by session */

export const queryUserIdsBySessionId = async (sessionId: string): Promise<string[]> => {
  const command = new QueryCommand({
    ExpressionAttributeValues: {
      ':v1': {
        S: sessionId,
      },
    },
    KeyConditionExpression: 'SessionId = :v1',
    ProjectionExpression: 'UserId',
    TableName: dynamodbDecisionTableName,
  })
  const response = await dynamodb.send(command)
  return response.Items.map((item: any) => item.UserId.S)
}

/* Scan for expired items */

export const scanExpiredSessionIds = async (): Promise<string[]> => {
  const command = new ScanCommand({
    ExpressionAttributeValues: {
      ':v1': {
        N: '1',
      },
      ':v2': {
        N: `${new Date().getTime()}`,
      },
    },
    FilterExpression: 'Expiration BETWEEN :v1 AND :v2',
    IndexName: 'ExpirationIndex',
    TableName: dynamodbSessionTableName,
  })
  const response = await dynamodb.send(command)
  return response.Items.map((item: any) => item.SessionId.S)
}

/* Scan for all items */

const getItemsFromScan = (response: ScanOutput): SessionBatch[] =>
  response.Items?.map((item) => ({
    data: JSON.parse(item.Data.S as string),
    id: item.SessionId.S as string,
  })) as SessionBatch[]

export const scanSessions = async (): Promise<SessionBatch[]> => {
  const command = new ScanCommand({
    AttributesToGet: ['Data', 'SessionId', 'Expiration'],
    TableName: dynamodbSessionTableName,
  })
  const response = await dynamodb.send(command)
  return getItemsFromScan(response)
}

/* Set item */

export const setDecisionById = async (sessionId: string, userId: string, data: Decision): Promise<PutItemOutput> => {
  const command = new PutItemCommand({
    Item: {
      Data: {
        S: JSON.stringify(data),
      },
      SessionId: {
        S: `${sessionId}`,
      },
      UserId: {
        S: `${userId}`,
      },
    },
    TableName: dynamodbDecisionTableName,
  })
  return dynamodb.send(command)
}

export const setSessionById = async (sessionId: string, data: Session): Promise<PutItemOutput> => {
  const command = new PutItemCommand({
    Item: {
      Data: {
        S: JSON.stringify(data),
      },
      Expiration: {
        N: `${data.expiration ?? 0}`,
      },
      SessionId: {
        S: `${sessionId}`,
      },
    },
    TableName: dynamodbSessionTableName,
  })
  return dynamodb.send(command)
}
