import eventJson from '@events/get-place-types.json'
import { getPlaceTypesHandler } from '@handlers/get-place-types'
import { APIGatewayProxyEventV2 } from '@types'
import { PlaceTypeDisplay } from '@types'

jest.mock('@utils/logging')

describe('get-place-types', () => {
  const event = eventJson as unknown as APIGatewayProxyEventV2

  describe('getPlaceTypesHandler', () => {
    it('should return OK status with list of place types', async () => {
      const result = await getPlaceTypesHandler(event)
      const placeTypes = JSON.parse(result.body).types as PlaceTypeDisplay
      expect(placeTypes).toEqual(
        expect.arrayContaining([
          {
            canBeExcluded: false,
            defaultType: true,
            display: 'Any restaurant',
            mustBeSingleType: true,
            value: 'restaurant',
          },
          { display: 'Cat cafe', value: 'cat_cafe' },
          { defaultExclude: true, display: 'Fast food', value: 'fast_food_restaurant' },
        ]),
      )
      expect(result).toEqual(expect.objectContaining({ statusCode: 200 }))
    })
  })
})
