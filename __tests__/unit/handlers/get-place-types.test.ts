import { APIGatewayProxyEventV2 } from '@types'
import eventJson from '@events/get-place-types.json'
import { getPlaceTypesHandler } from '@handlers/get-place-types'
import { PlaceTypeDisplay } from '@types'

jest.mock('@utils/logging')

describe('get-place-types', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  describe('getPlaceTypesHandler', () => {
    test('expect OK and places returned', async () => {
      const result = await getPlaceTypesHandler(event)
      const placeTypes = JSON.parse(result.body).types as PlaceTypeDisplay
      expect(placeTypes).toEqual(
        expect.arrayContaining([
          { defaultType: true, display: 'Any restaurant', value: 'restaurant' },
          { display: 'Cat cafe', value: 'cat_cafe' },
          { defaultExclude: true, display: 'Fast food', value: 'fast_food_restaurant' },
        ]),
      )
      expect(result).toEqual(expect.objectContaining({ statusCode: 200 }))
    })
  })
})
