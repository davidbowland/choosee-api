import { recaptchaToken } from '../__mocks__'
import eventJson from '@events/post-session.json'
import { getCaptchaScore, getScoreFromEvent } from '@services/recaptcha'
import { APIGatewayProxyEventV2 } from '@types'
import * as events from '@utils/events'

const mockPost = jest.fn()
jest.mock('axios', () => ({
  create: jest.fn().mockImplementation(() => ({ post: (...args) => mockPost(...args) })),
}))
jest.mock('axios-retry')
jest.mock('@utils/events')
jest.mock('@utils/logging')

describe('recaptcha', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    jest.mocked(events).extractTokenFromEvent.mockReturnValue(recaptchaToken)
    mockPost.mockResolvedValue({ data: { score: 0.9 } })
  })

  describe('getCaptchaScore', () => {
    it('should pass token and secret to request', async () => {
      await getCaptchaScore(recaptchaToken)
      expect(mockPost).toHaveBeenCalledWith(
        'recaptcha/api/siteverify',
        {},
        {
          params: {
            response: 'ytrewsdfghjmnbgtyu',
            secret: process.env.RECAPTCHA_SECRET_KEY,
          },
        },
      )
    })

    it('should return score', async () => {
      const score = await getCaptchaScore(recaptchaToken)
      expect(score).toEqual(0.9)
    })
  })

  describe('getScoreFromEvent', () => {
    it('should pass token and secret to request', async () => {
      await getScoreFromEvent(event)
      expect(mockPost).toHaveBeenCalled()
    })

    it('should return 1.0 score when internal request', async () => {
      const internalEvent = { ...event, requestContext: { domainPrefix: 'choosee-api-internal' } }
      const score = await getScoreFromEvent(internalEvent as unknown as APIGatewayProxyEventV2)
      expect(score).toEqual(1.0)
    })

    it('should return score', async () => {
      const score = await getScoreFromEvent(event)
      expect(score).toEqual(0.9)
    })
  })
})
