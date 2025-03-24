import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from '../types'
import { getChoiceById } from '../services/dynamodb'
import { log } from '../utils/logging'
import status from '../utils/status'

const fetchById = async (choiceId: string): Promise<APIGatewayProxyResultV2<any>> => {
  try {
    const data = await getChoiceById(choiceId)
    return { ...status.OK, body: JSON.stringify({ ...data, choiceId }) }
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
