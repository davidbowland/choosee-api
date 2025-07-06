import { getChoiceById } from '../services/dynamodb'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, PriceLevel } from '../types'
import { log } from '../utils/logging'
import status from '../utils/status'

const PRICE_LEVEL_TO_FORMATTED = {
  PRICE_LEVEL_UNSPECIFIED: { label: 'Unspecified', rating: 0 },
  PRICE_LEVEL_FREE: { label: 'Free', rating: 0 }, // eslint-disable-line sort-keys
  PRICE_LEVEL_INEXPENSIVE: { label: 'Inexpensive', rating: 1 },
  PRICE_LEVEL_MODERATE: { label: 'Moderate', rating: 2 },
  PRICE_LEVEL_EXPENSIVE: { label: 'Expensive', rating: 3 }, // eslint-disable-line sort-keys
  PRICE_LEVEL_VERY_EXPENSIVE: { label: 'Very expensive', rating: 4 },
}

const fetchById = async (choiceId: string): Promise<APIGatewayProxyResultV2<any>> => {
  try {
    const data = await getChoiceById(choiceId)
    const choices = data.choices.map((c) => ({
      ...c,
      formattedPriceLevel: PRICE_LEVEL_TO_FORMATTED[c.priceLevel as PriceLevel],
    }))
    return { ...status.OK, body: JSON.stringify({ ...data, choiceId, choices }) }
  } catch (error) {
    return status.NOT_FOUND
  }
}

export const getChoiceByIdHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<any>> => {
  log('Received event', { ...event, body: undefined })
  const choiceId = event.pathParameters?.choiceId as string
  const result = await fetchById(choiceId)
  return result
}
