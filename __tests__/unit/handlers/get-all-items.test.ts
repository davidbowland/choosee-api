import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import { session, sessionId } from '../__mocks__'
import { APIGatewayProxyEventV2 } from '@types'
import eventJson from '@events/get-all-items.json'
import { getAllItemsHandler } from '@handlers/get-all-items'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('get-all-items', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    mocked(dynamodb).scanSessions.mockResolvedValue([{ data: session, id: sessionId }])
  })

  describe('getAllItemsHandler', () => {
    test('expect INTERNAL_SERVER_ERROR on scanSessions reject', async () => {
      mocked(dynamodb).scanSessions.mockRejectedValueOnce(undefined)
      const result = await getAllItemsHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect OK and data', async () => {
      const result = await getAllItemsHandler(event)
      expect(result).toEqual({ ...status.OK, body: JSON.stringify([{ data: session, id: sessionId }]) })
    })
  })
})
