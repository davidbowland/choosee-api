import { mocked } from 'jest-mock'

import * as events from '@utils/events'
import * as queue from '@services/sms'
import { APIGatewayProxyEventV2 } from '@types'
import { decodedJwt } from '../__mocks__'
import eventJson from '@events/post-send-text-to.json'
import { postSendTextToHandler } from '@handlers/post-send-text-to'
import status from '@utils/status'

jest.mock('@services/sms')
jest.mock('@utils/events')
jest.mock('@utils/logging')

describe('post-send-text-to', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    mocked(events).extractJwtFromEvent.mockReturnValue(decodedJwt)
  })

  describe('postSendTextToHandler', () => {
    test('expect INTERNAL_SERVER_ERROR when extractJwtFromEvent throws', async () => {
      mocked(events).extractJwtFromEvent.mockImplementationOnce(() => {
        throw new Error('JWT error')
      })
      const result = await postSendTextToHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect FORBIDDEN when JWT is invalid', async () => {
      mocked(events).extractJwtFromEvent.mockReturnValueOnce(null)
      const result = await postSendTextToHandler(event)
      expect(result).toEqual({ body: JSON.stringify({ message: 'Invalid JWT' }), statusCode: 403 })
    })

    test('expect BAD_REQUEST when invalid phone number', async () => {
      const tempEvent = { ...event, pathParameters: { sessionId: 'abc123', toUserId: '+invalid' } }
      const result = await postSendTextToHandler(tempEvent)
      expect(result).toEqual({ ...status.BAD_REQUEST, body: JSON.stringify({ message: 'Invalid phone number' }) })
    })

    test('expect sendSMS is called and NO_CONTENT status returned', async () => {
      const result = await postSendTextToHandler(event)
      expect(mocked(queue).sendSms).toHaveBeenCalledWith(
        '+18005556789',
        'Dave (+15551234567) is inviting you to vote: http://choosee.bowland.link/s/abc123?u=%2B18005556789',
      )
      expect(result).toEqual(status.NO_CONTENT)
    })
  })
})
