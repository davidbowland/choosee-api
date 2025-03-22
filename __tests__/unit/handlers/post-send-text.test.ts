import { mocked } from 'jest-mock'

import * as events from '@utils/events'
import * as queue from '@services/sms'
import { APIGatewayProxyEventV2 } from '@types'
import { decodedJwt } from '../__mocks__'
import eventJson from '@events/post-send-text.json'
import { postSendTextHandler } from '@handlers/post-send-text'
import status from '@utils/status'

jest.mock('@services/sms')
jest.mock('@utils/events')
jest.mock('@utils/logging')

describe('post-send-text', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    mocked(events).extractJwtFromEvent.mockReturnValue(decodedJwt)
  })

  describe('postSendTextHandler', () => {
    test('expect INTERNAL_SERVER_ERROR when extractJwtFromEvent throws', async () => {
      mocked(events).extractJwtFromEvent.mockImplementationOnce(() => {
        throw new Error('JWT error')
      })
      const result = await postSendTextHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect FORBIDDEN when JWT is invalid', async () => {
      mocked(events).extractJwtFromEvent.mockReturnValueOnce(null)
      const result = await postSendTextHandler(event)
      expect(result).toEqual({ body: JSON.stringify({ message: 'Invalid JWT' }), statusCode: 403 })
    })

    test('expect sendSMS is called and NO_CONTENT status returned', async () => {
      const result = await postSendTextHandler(event)
      expect(mocked(queue).sendSms).toHaveBeenCalledWith(
        '+15551234567',
        'Your Choosee session is: http://choosee.bowland.link/s/abc123',
      )
      expect(result).toEqual(status.NO_CONTENT)
    })
  })
})
