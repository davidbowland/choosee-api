import axios from 'axios'

import { APIGatewayProxyEventV2 } from '../types'
import { extractTokenFromEvent } from '../utils/events'

const google = axios.create({
  baseURL: 'https://www.google.com/',
})

export const getCaptchaScore = async (token: string): Promise<number> =>
  google
    .post(
      'recaptcha/api/siteverify',
      {},
      {
        params: {
          response: token,
          secret: process.env.RECAPTCHA_SECRET_KEY,
        },
      },
    )
    .then((response) => response.data.score)

export const getScoreFromEvent = async (event: APIGatewayProxyEventV2): Promise<number> => {
  if (event.requestContext?.domainPrefix === 'choosee-maps-api-internal') {
    return 1
  } else {
    return await getCaptchaScore(extractTokenFromEvent(event))
  }
}
