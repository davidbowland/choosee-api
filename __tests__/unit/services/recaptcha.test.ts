import { recaptchaToken } from '../__mocks__'
import { recaptchaSecretKey } from '@config'
import { getCaptchaScore } from '@services/recaptcha'

const mockPost = jest.fn()
jest.mock('axios', () => ({
  create: jest.fn().mockImplementation(() => ({ post: (...args) => mockPost(...args) })),
}))
jest.mock('axios-retry')
jest.mock('@utils/logging')

describe('recaptcha', () => {
  beforeAll(() => {
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
            secret: recaptchaSecretKey,
          },
        },
      )
    })

    it('should return score', async () => {
      const score = await getCaptchaScore(recaptchaToken)
      expect(score).toEqual(0.9)
    })

    it('should throw when response is missing score', async () => {
      mockPost.mockResolvedValueOnce({ data: {} })
      await expect(getCaptchaScore(recaptchaToken)).rejects.toThrow('reCAPTCHA response missing score')
    })

    it('should throw when score is not a number', async () => {
      mockPost.mockResolvedValueOnce({ data: { score: undefined } })
      await expect(getCaptchaScore(recaptchaToken)).rejects.toThrow('reCAPTCHA response missing score')
    })
  })
})
