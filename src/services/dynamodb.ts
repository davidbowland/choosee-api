import { DynamoDB, GetItemCommand, PutItemCommand, PutItemOutput, QueryCommand } from '@aws-sdk/client-dynamodb'

import { Choice, Decision, Session } from '../types'
import { dynamodbChoicesTable, dynamodbDecisionsTableName, dynamodbSessionsTableName } from '../config'
import { xrayCapture } from '../utils/logging'

const dynamodb = xrayCapture(new DynamoDB({ apiVersion: '2012-08-10' }))

/* Choices */

export const getChoiceById = async (choiceId: string): Promise<Choice> => {
  const command = new GetItemCommand({
    Key: {
      ChoiceId: {
        S: `${choiceId}`,
      },
    },
    TableName: dynamodbChoicesTable,
  })
  const response = await dynamodb.send(command)
  return JSON.parse(response.Item.Data.S)
}

export const setChoiceById = async (choiceId: string, choice: Choice): Promise<PutItemOutput> => {
  const command = new PutItemCommand({
    Item: {
      ChoiceId: {
        S: `${choiceId}`,
      },
      Data: {
        S: JSON.stringify(choice),
      },
      Expiration: {
        N: `${choice.expiration ?? 0}`,
      },
    },
    TableName: dynamodbChoicesTable,
  })
  return dynamodb.send(command)
}

/* Decisions */

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
    TableName: dynamodbDecisionsTableName,
  })
  const response = await dynamodb.send(command)
  try {
    return JSON.parse(response.Item.Data.S)
  } catch (e) {
    return { decisions: [] } as unknown as Decision
  }
}

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
    TableName: dynamodbDecisionsTableName,
  })
  return dynamodb.send(command)
}

/* Sessions */

export const getSessionById = async (sessionId: string): Promise<Session> => {
  const command = new GetItemCommand({
    Key: {
      SessionId: {
        S: `${sessionId}`,
      },
    },
    TableName: dynamodbSessionsTableName,
  })
  const response = await dynamodb.send(command)
  return JSON.parse(response.Item.Data.S)
}

export const queryUserIdsBySessionId = async (sessionId: string): Promise<string[]> => {
  const command = new QueryCommand({
    ExpressionAttributeValues: {
      ':v1': {
        S: sessionId,
      },
    },
    KeyConditionExpression: 'SessionId = :v1',
    ProjectionExpression: 'UserId',
    TableName: dynamodbDecisionsTableName,
  })
  const response = await dynamodb.send(command)
  return response.Items.map((item: any) => item.UserId.S)
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
    TableName: dynamodbSessionsTableName,
  })
  return dynamodb.send(command)
}
