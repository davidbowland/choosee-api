import { mocked } from 'jest-mock'

import * as dynamodb from '@services/dynamodb'
import { choice, choiceId } from '../__mocks__'
import { APIGatewayProxyEventV2 } from '@types'
import eventJson from '@events/get-choice-by-id.json'
import { getChoiceByIdHandler } from '@handlers/get-choice-by-id'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('get-choice-by-id', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    mocked(dynamodb).getChoiceById.mockResolvedValue(choice)
  })

  describe('getChoiceByIdHandler', () => {
    test('expect NOT_FOUND on getChoiceById reject', async () => {
      mocked(dynamodb).getChoiceById.mockRejectedValueOnce(undefined)
      const result = await getChoiceByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.NOT_FOUND))
    })

    test('expect OK when id exists', async () => {
      const result = await getChoiceByIdHandler(event)
      expect(result).toEqual({ ...status.OK, body: JSON.stringify({ ...choice, choiceId }) })
    })
  })
})
