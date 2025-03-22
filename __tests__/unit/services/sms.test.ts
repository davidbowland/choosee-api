import { http, HttpResponse, server } from '@setup-server'
import { smsApiKey, smsApiUrl } from '@config'
import { sendSms } from '@services/sms'

jest.mock('@utils/logging')

describe('queue', () => {
  describe('sendSms', () => {
    const to = '+1800JENNYCRAIG'
    const contents = 'Hello, Goodbye!'
    const postEndpoint = jest.fn().mockReturnValue(200)

    beforeAll(() => {
      server.use(
        http.post(`${smsApiUrl}/messages`, async ({ request }) => {
          if (smsApiKey !== request.headers.get('x-api-key')) {
            return new HttpResponse(null, { status: 403 })
          }

          const body = postEndpoint(await request.json())
          return body ? HttpResponse.json(body) : new HttpResponse(null, { status: 400 })
        }),
      )
    })

    test('expect sms contents to be passed to the endpoint', async () => {
      await sendSms(to, contents)
      expect(postEndpoint).toHaveBeenCalledWith({
        contents,
        messageType: 'TRANSACTIONAL',
        to,
      })
    })
  })
})
