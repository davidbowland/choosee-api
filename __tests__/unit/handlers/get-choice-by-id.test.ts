import { choice, choiceId } from '../__mocks__'
import eventJson from '@events/get-choice-by-id.json'
import { getChoiceByIdHandler } from '@handlers/get-choice-by-id'
import * as dynamodb from '@services/dynamodb'
import { APIGatewayProxyEventV2 } from '@types'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('get-choice-by-id', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    jest.mocked(dynamodb).getChoiceById.mockResolvedValue(choice)
  })

  describe('getChoiceByIdHandler', () => {
    it('should return NOT_FOUND when getChoiceById rejects', async () => {
      jest.mocked(dynamodb).getChoiceById.mockRejectedValueOnce(undefined)
      const result = await getChoiceByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.NOT_FOUND))
    })

    it('should return OK with formatted data when id exists', async () => {
      const choices = choice.choices.map((c) => ({ ...c, formattedPriceLevel: { label: 'Moderate', rating: 2 } }))
      const result = await getChoiceByIdHandler(event)
      expect(result).toEqual({ ...status.OK, body: JSON.stringify({ ...choice, choiceId, choices }) })
    })
  })
})
