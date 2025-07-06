import { sendSms } from '@services/sms'

const mockPost = jest.fn()
jest.mock('axios', () => ({
  create: jest.fn().mockImplementation(() => ({ post: (...args) => mockPost(...args) })),
}))
jest.mock('axios-retry')
jest.mock('@utils/logging')

describe('queue', () => {
  describe('sendSms', () => {
    const to = '+1800JENNYCRAIG'
    const contents = 'Hello, Goodbye!'

    beforeAll(() => {
      mockPost.mockResolvedValue({ status: 200 })
    })

    it('should pass sms contents to the endpoint', async () => {
      await sendSms(to, contents)
      expect(mockPost).toHaveBeenCalledWith(
        '/messages',
        {
          contents,
          messageType: 'TRANSACTIONAL',
          to,
        },
        {},
      )
    })
  })
})
