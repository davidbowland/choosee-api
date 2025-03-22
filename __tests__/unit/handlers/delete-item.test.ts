import * as dynamodb from '@services/dynamodb'
import { session, sessionId } from '../__mocks__'
import { APIGatewayProxyEventV2 } from '@types'
import { deleteByIdHandler } from '@handlers/delete-item'
import eventJson from '@events/delete-item.json'
import { mocked } from 'jest-mock'
import status from '@utils/status'

jest.mock('@services/dynamodb')
jest.mock('@utils/logging')

describe('delete-item', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  beforeAll(() => {
    mocked(dynamodb).getSessionById.mockResolvedValue(session)
  })

  describe('deleteByIdHandler', () => {
    test('expect deleteDataById called when getDataById resolves', async () => {
      await deleteByIdHandler(event)
      expect(mocked(dynamodb).deleteSessionById).toHaveBeenCalledWith(sessionId)
    })

    test('expect deleteDataById not to be called when getDataById rejects', async () => {
      mocked(dynamodb).getSessionById.mockRejectedValueOnce(undefined)
      await deleteByIdHandler(event)
      expect(mocked(dynamodb).deleteSessionById).toHaveBeenCalledTimes(0)
    })

    test('expect INTERNAL_SERVER_ERROR on deleteDataById reject', async () => {
      mocked(dynamodb).deleteSessionById.mockRejectedValueOnce(undefined)
      const result = await deleteByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.INTERNAL_SERVER_ERROR))
    })

    test('expect OK when index exists', async () => {
      const result = await deleteByIdHandler(event)
      expect(result).toEqual({ ...status.OK, body: JSON.stringify(session) })
    })

    test('expect NO_CONTENT when index does not exist', async () => {
      mocked(dynamodb).getSessionById.mockRejectedValueOnce(undefined)
      const result = await deleteByIdHandler(event)
      expect(result).toEqual(expect.objectContaining(status.NO_CONTENT))
    })
  })
})
