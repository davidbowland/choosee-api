import { mocked } from 'jest-mock'

import * as events from '@utils/events'
import { getCaptchaScore, getScoreFromEvent } from '@services/recaptcha'
import { http, HttpResponse, server } from '@setup-server'
import { APIGatewayProxyEventV2 } from '@types'
import eventJson from '@events/post-item.json'
import { recaptchaToken } from '../__mocks__'

jest.mock('@utils/events')
jest.mock('@utils/logging')

describe('twitch', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2
  const postSiteVerify = jest.fn().mockReturnValue({ score: 0.9 })

  beforeAll(() => {
    mocked(events).extractTokenFromEvent.mockReturnValue(recaptchaToken)

    server.use(
      http.post('https://www.google.com/recaptcha/api/siteverify', async ({ request }) => {
        const url = new URL(request.url)
        const response = url.searchParams.get('response')
        const secret = url.searchParams.get('secret')
        const body = postSiteVerify(response, secret)
        return body ? HttpResponse.json(body) : new HttpResponse(null, { status: 400 })
      }),
    )
  })

  describe('getCaptchaScore', () => {
    test('expect token and secret passed to request', async () => {
      await getCaptchaScore(recaptchaToken)
      expect(postSiteVerify).toHaveBeenCalledWith('ytrewsdfghjmnbgtyu', 'ertyuiknbghj')
    })

    test('expect score returned', async () => {
      const score = await getCaptchaScore(recaptchaToken)
      expect(score).toEqual(0.9)
    })
  })

  describe('getScoreFromEvent', () => {
    test('expect token and secret passed to request', async () => {
      await getScoreFromEvent(event)
      expect(postSiteVerify).toHaveBeenCalledWith('ytrewsdfghjmnbgtyu', 'ertyuiknbghj')
    })

    test('expect 1.0 score when internal request', async () => {
      const internalEvent = { ...event, requestContext: { domainPrefix: 'choosee-maps-api-internal' } }
      const score = await getScoreFromEvent(internalEvent as unknown as APIGatewayProxyEventV2)
      expect(score).toEqual(1.0)
    })

    test('expect score returned', async () => {
      const score = await getScoreFromEvent(event)
      expect(score).toEqual(0.9)
    })
  })
})
