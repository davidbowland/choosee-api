import { advanceRounds, createChoices, fetchChoices } from '@services/maps'
import { choice, choiceId, newChoice } from '../__mocks__'
import { http, HttpResponse, server } from '@setup-server'
import { mapsApiKey, mapsApiUrl } from '@config'

jest.mock('@utils/logging')

describe('choices', () => {
  describe('advanceRounds', () => {
    const postAdvanceEndpoint = jest.fn().mockReturnValue(choice)

    beforeAll(() => {
      server.use(
        http.post(`${mapsApiUrl}/choices/:id/advance`, async ({ params, request }) => {
          const { id } = params
          if (choiceId !== id || mapsApiKey !== request.headers.get('x-api-key')) {
            return new HttpResponse(null, { status: 403 })
          }

          const body = postAdvanceEndpoint()
          return body ? HttpResponse.json(body) : new HttpResponse(null, { status: 400 })
        }),
      )
    })

    test('expect advance endpoint called with correct ID and API key', async () => {
      await advanceRounds(choiceId)
      expect(postAdvanceEndpoint).toHaveBeenCalled()
    })

    test('expect choices returned', async () => {
      const result = await advanceRounds(choiceId)
      expect(result).toEqual(choice)
    })
  })

  describe('createChoices', () => {
    const postEndpoint = jest.fn().mockReturnValue(choice)

    beforeAll(() => {
      server.use(
        http.post(`${mapsApiUrl}/choices`, async ({ request }) => {
          if (mapsApiKey !== request.headers.get('x-api-key')) {
            return new HttpResponse(null, { status: 403 })
          }

          const body = postEndpoint(await request.json())
          return body ? HttpResponse.json(body) : new HttpResponse(null, { status: 400 })
        }),
      )
    })

    test('expect post endpoint called with API key', async () => {
      await createChoices(newChoice)
      expect(postEndpoint).toHaveBeenCalled()
    })

    test('expect choices returned', async () => {
      const result = await createChoices(newChoice)
      expect(result).toEqual(choice)
    })
  })

  describe('fetchChoices', () => {
    const getEndpoint = jest.fn().mockReturnValue(choice)

    beforeAll(() => {
      server.use(
        http.get(`${mapsApiUrl}/choices/:id`, async ({ params, request }) => {
          const { id } = params
          if (choiceId !== id || mapsApiKey !== request.headers.get('x-api-key')) {
            return new HttpResponse(null, { status: 403 })
          }

          const body = getEndpoint()
          return body ? HttpResponse.json(body) : new HttpResponse(null, { status: 400 })
        }),
      )
    })

    test('expect get endpoint called with correct ID and API key', async () => {
      await fetchChoices(choiceId)
      expect(getEndpoint).toHaveBeenCalled()
    })

    test('expect choices returned', async () => {
      const result = await fetchChoices(choiceId)
      expect(result).toEqual([
        {
          name: 'Love Sushi',
          photos: [
            'https://lh3.googleusercontent.com/places/AAcXr8oBxiksR5oYZQn-zWB0nAq28N8_8NwS22B5DgfqUhbufLJG46BLgNnLw-le9aH3GJw8fO6R4zGuDdjr-91Xzz_jyU_XQAvvCLg=s1600-w400-h300',
          ],
          placeId: 'ChIJSQVzHAW23IcR8J6g9IzzZ0k',
          priceLevel: 1,
          rating: 4.4,
          vicinity: '2101 West Broadway Suite S, Columbia',
        },
      ])
    })
  })
})
